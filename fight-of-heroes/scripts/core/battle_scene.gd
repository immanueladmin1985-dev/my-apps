extends Node2D
## 전투 화면. 경기 설정을 읽어 맵과 영웅을 만들고, 조작기·HUD·카메라를 연결한다.

var config: MatchConfig
var map: MapData
var player_hero: Hero = null
var player_controller: PlayerController = null
var follow_target: Node2D = null
## 이어 하기로 연 전투인지
var resumed := false
## 전장의 안개 (관전·자동 진행이거나 설정에서 끄면 없음)
var fog: FogOfWar = null
## 자동 저장 간격(초, 경기 시간 기준)
const AUTOSAVE_INTERVAL := 15.0
## 카메라가 영웅을 따라가지 않고 한 자리를 볼 때 (미니맵을 눌렀거나 관전 중 화면을 끌었을 때)
var free_look := false
var free_pos := Vector2.ZERO
var _autosave_left := AUTOSAVE_INTERVAL
## 와이파이 대전 동기화 (혼자 하는 경기에서는 없음)
var net_sync: NetSync = null

@onready var arena: Arena = $Arena
@onready var world: Node2D = $World
@onready var camera: Camera2D = $Camera
@onready var hud = $HUD
@onready var battle_manager: BattleManager = $BattleManager
@onready var hero_manager: HeroManager = $HeroManager
@onready var ai_manager: AIManager = $AIManager
@onready var monster_manager: MonsterManager = $MonsterManager
@onready var boss_manager: BossManager = $BossManager
@onready var experience_manager: ExperienceManager = $ExperienceManager
@onready var shop_manager: ShopManager = $ShopManager


func _ready() -> void:
	config = GameManager.match_config
	if config == null:
		config = GameManager.default_config()
		GameManager.match_config = config
	map = DataRegistry.map_data(config.map_id)
	View.setup_from_settings()
	camera.zoom = Vector2(camera.zoom.x, camera.zoom.x * View.tilt)
	arena.build(map)
	hero_manager.setup(world, map, config)
	ai_manager.setup(config.difficulty, hero_manager)
	ai_manager.raid = config.is_raid()
	var center := map.size * 0.5
	var seed_base := 0
	if GameManager.dev_args.has("seed"):
		seed_base = int(GameManager.dev_args["seed"])
	var lan: bool = config.mode == "lan" and Net.is_online()
	if lan:
		seed_base = config.net_seed
		net_sync = NetSync.new()
		net_sync.name = "NetSync"
	for team in [Enums.Team.BLUE, Enums.Team.RED]:
		var ids: PackedStringArray = config.blue_heroes if team == Enums.Team.BLUE else config.red_heroes
		for i in ids.size():
			var data := DataRegistry.hero(ids[i])
			if data == null:
				push_error("영웅 데이터가 없습니다: " + ids[i])
				continue
			var h := hero_manager.spawn(data, team, i)
			var my_team: int = config.net_my_team if lan else Enums.Team.BLUE
			var is_player: bool = team == my_team and i == config.player_index
			var slot: int = (0 if team == Enums.Team.BLUE else 3) + i
			if is_player and not config.autoplay:
				player_controller = PlayerController.new()
				player_controller.name = "PlayerController"
				h.set_controller(player_controller)
			elif lan and Net.is_client():
				pass  # 참가자 화면의 다른 영웅은 방장이 보낸 대로 움직인다.
			elif lan and config.net_humans.has(slot):
				var rc := RemoteController.new()
				rc.name = "RemoteController"
				rc.sync = net_sync
				h.set_controller(rc)
			else:
				var s: int = seed_base + team * 100 + i if seed_base != 0 else 0
				ai_manager.attach(h, map.spawn_of(team), center, s)
			if is_player:
				player_hero = h
				# 사람이 조작할 때만 팀 계획에서 "플레이어"로 본다.
				if not config.autoplay:
					ai_manager.set_player(team, h)
				h.get_node("Visual").is_player = true
	for team in [Enums.Team.BLUE, Enums.Team.RED]:
		ai_manager.assign_roles(team)
	if net_sync != null:
		add_child(net_sync)
		net_sync.setup(self)
	UnitVisual.viewer_team = player_hero.team if player_hero != null else Enums.Team.BLUE
	# 안개는 늘 계산한다 (AI 도 자기 팀 시야만 본다). 화면에는 사람이 하는 팀의 시야만 그린다.
	# 설정에서 끄면 모두가 모든 것을 본다.
	if bool(SaveManager.get_setting("fog_of_war", true)) and not GameManager.dev_args.has("no_fog"):
		fog = FogOfWar.new()
		fog.name = "FogOfWar"
		add_child(fog)
		move_child(fog, world.get_index() + 1)
		var show: bool = player_hero != null and (not config.autoplay or GameManager.dev_args.has("fog")) and not GameManager.dev_args.has("overview")
		fog.setup(map, hero_manager, player_hero.team if show else -1)
	AudioManager.player_unit = player_hero if not config.autoplay else null
	follow_target = player_hero if player_hero != null else (hero_manager.heroes[0] if not hero_manager.heroes.is_empty() else null)
	battle_manager.setup(config, hero_manager)
	battle_manager.ended.connect(func(_w, _r): GameManager.on_match_finished(battle_manager.summary(), self))
	monster_manager.setup(world, map, config)
	boss_manager.setup(battle_manager, hero_manager, monster_manager)
	experience_manager.setup(hero_manager, battle_manager)
	hero_manager.battle = battle_manager
	ai_manager.monster_manager = monster_manager
	shop_manager.setup(map)
	# 룬 제단
	var runes := RuneManager.new()
	runes.name = "Runes"
	world.add_child(runes)
	runes.setup(map, hero_manager, seed_base)
	var goblins := GoblinEvent.new()
	goblins.name = "GoblinEvent"
	add_child(goblins)
	goblins.setup(world, map, seed_base)
	ai_manager.shop = shop_manager
	camera.limit_left = int(-80)
	camera.limit_top = int(-80)
	camera.limit_right = int(map.size.x + 80)
	camera.limit_bottom = int(map.size.y + 80)
	if follow_target != null:
		camera.global_position = follow_target.global_position
		camera.reset_smoothing()
	$AimIndicator.setup(player_hero, player_controller)
	hud.ai_manager = ai_manager
	hud.shop = shop_manager
	hud.setup(player_hero, player_controller, battle_manager)
	hud.setup_overview(map, hero_manager, camera, monster_manager)
	hud.minimap.look_requested.connect(look_at_point)
	hud.blue_status.hero_selected.connect(focus_hero)
	hud.red_status.hero_selected.connect(focus_hero)
	hud.focus_button.pressed.connect(return_to_player)
	if player_controller == null:
		hud.show_message("미니맵을 누르면 그곳을, 위쪽 얼굴을 누르면 그 영웅을 비춥니다. 화면을 끌어도 움직입니다")
	if not GameManager.resume_snapshot.is_empty():
		var snap := GameManager.resume_snapshot
		GameManager.resume_snapshot = {}
		resumed = BattleSnapshot.apply(self, snap)
		if not resumed:
			push_warning("저장한 전투를 되돌리지 못했습니다")
		elif follow_target != null:
			camera.global_position = follow_target.global_position
			camera.reset_smoothing()
		if resumed and player_controller != null:
			# 바로 싸움이 이어지지 않도록 일시정지한 채로 시작한다.
			hud.set_paused(true)
			hud.show_message("저장한 전투를 불러왔습니다. 계속하기를 누르세요")
	if GameManager.dev_args.has("look"):
		# 개발용: --look=x,y 로 맵의 한 자리를 비춘다.
		var xy: PackedStringArray = str(GameManager.dev_args["look"]).split(",")
		if xy.size() == 2:
			look_at_point(Vector2(float(xy[0]), float(xy[1])))
	if GameManager.dev_args.has("scoreboard"):
		hud.toggle_scoreboard()
	if GameManager.dev_args.has("goblin") and player_hero != null:
		# 개발용: 내 영웅 앞에 황금 고블린을 부르고 와드를 하나 꽂는다.
		var g: Monster = goblins.spawn()
		g.global_position = player_hero.global_position + Vector2(260, 0)
		g.health.hp = g.health.max_hp() * 0.55
		g.on_damaged(player_hero, 1.0)
		Ward.place(player_hero, player_hero.global_position + Vector2(-150, 60), 90.0)
	if GameManager.dev_args.has("ping") and player_hero != null:
		# 개발용: --ping=attack|danger|gather 로 내 영웅 앞에 신호를 찍고 신호 창을 연다.
		hud.choose_ping(str(GameManager.dev_args["ping"]))
		hud.place_ping(player_hero.global_position + Vector2(280, -60))
		hud.toggle_ping_menu()
	if GameManager.dev_args.has("fx_demo") and player_hero != null:
		var demo = load("res://scripts/dev/fx_demo.gd").new()
		demo.name = "FxDemo"
		add_child(demo)
	if GameManager.dev_args.has("open_shop") and player_hero != null:
		# 개발용: 상점 화면 확인. 아이템 몇 개를 미리 산 상태로 연다.
		player_hero.gold = 3000
		for id in ["dagger", "health_potion", "health_potion", "old_boots"]:
			shop_manager.buy(player_hero, id)
		if GameManager.dev_args["open_shop"] != "closed":
			hud.toggle_shop()
			hud.shop_panel._select_item(ItemManager.get_item("hero_sword"))


## 이어 하기용으로 전투를 저장한다. 끝난 경기, 시험용 자동 진행 경기, 와이파이 대전, 보스 레이드는 저장하지 않는다.
func can_save() -> bool:
	return battle_manager != null and not battle_manager.match_over and config != null and not config.autoplay and config.mode != "lan" and not config.is_raid()


func save_snapshot() -> bool:
	if not can_save():
		return false
	return SaveManager.save_battle(BattleSnapshot.capture(self))


func _physics_process(delta: float) -> void:
	_autosave_left -= delta
	if _autosave_left <= 0.0:
		_autosave_left = AUTOSAVE_INTERVAL
		save_snapshot()


func _process(_delta: float) -> void:
	if GameManager.dev_args.has("overview"):
		# 개발용: 맵 전체를 한 화면에 본다.
		var vp := get_viewport_rect().size
		var z := minf(vp.x / (map.size.x + 200.0), vp.y / ((map.size.y + 200.0) * View.tilt))
		camera.zoom = Vector2(z, z * View.tilt)
		camera.position_smoothing_enabled = false
		camera.limit_left = -100000
		camera.limit_top = -100000
		camera.limit_right = 100000
		camera.limit_bottom = 100000
		camera.global_position = map.size * 0.5
		return
	if GameManager.dev_args.has("follow_boss"):
		var b := get_tree().get_first_node_in_group("bosses")
		if b != null:
			follow_target = b
	_update_camera()


# ---- 카메라: 영웅 따라가기 / 원하는 곳 보기 ----

## 미니맵을 누른 곳처럼 맵의 한 자리를 본다.
func look_at_point(p: Vector2) -> void:
	free_look = true
	free_pos = p.clamp(Vector2.ZERO, map.size)


## 영웅 얼굴을 눌렀을 때: 그 영웅을 따라간다. 안개 속의 적은 볼 수 없다.
func focus_hero(h) -> void:
	if h == null or not is_instance_valid(h):
		return
	if not FogOfWar.can_see(h):
		hud.show_message("%s 은(는) 지금 시야 밖에 있습니다" % h.display_name)
		return
	free_look = false
	follow_target = h
	if h.is_dead:
		look_at_point(h.global_position)


func return_to_player() -> void:
	if player_hero != null:
		free_look = false
		follow_target = player_hero


## 카메라가 내 영웅을 떠나 있는지 (직접 조작하는 경기에서만)
func camera_away() -> bool:
	return player_controller != null and (free_look or follow_target != player_hero)


func _update_camera() -> void:
	if camera_away() and not hud.minimap.is_held():
		# 움직이거나 공격·스킬을 쓰면 바로 내 영웅으로 돌아온다.
		var c := player_controller
		if c.joystick.length() > 0.3 or c.attack_held or c.aiming_slot >= 0:
			return_to_player()
	hud.focus_button.visible = camera_away()
	if not free_look and follow_target != null and is_instance_valid(follow_target):
		if follow_target is Unit and not FogOfWar.can_see(follow_target):
			# 따라가던 적이 안개 속으로 사라지면 그 자리에 멈춘다.
			look_at_point(follow_target.global_position)
		else:
			camera.global_position = follow_target.global_position
	if free_look:
		camera.global_position = free_pos


## 관전할 때는 화면을 손가락으로 끌어 둘러볼 수 있다.
func _unhandled_input(event: InputEvent) -> void:
	if player_controller != null or map == null:
		return
	if event is InputEventScreenDrag:
		var from := free_pos if free_look else camera.get_screen_center_position()
		look_at_point(from - event.relative / camera.zoom)


## 안드로이드 뒤로 가기: 일시정지 / 계속
func on_back() -> void:
	if hud.shop_open:
		hud.toggle_shop()
	elif not battle_manager.match_over:
		hud.set_paused(not get_tree().paused)


## 휴대폰에서 다른 앱으로 가거나 화면이 꺼지면 자동으로 일시정지하고 설정·기록을 저장한다.
func _notification(what: int) -> void:
	if what == NOTIFICATION_APPLICATION_PAUSED or what == NOTIFICATION_APPLICATION_FOCUS_OUT:
		SaveManager.save_data()
		save_snapshot()
		if hud != null and battle_manager != null and not battle_manager.match_over and not get_tree().paused and OS.has_feature("mobile"):
			hud.set_paused(true)


func _exit_tree() -> void:
	View.tilt = 1.0
	Bushes.list = PackedVector3Array()
