extends Node2D
## 전투 화면. 경기 설정을 읽어 맵과 영웅을 만들고, 조작기·HUD·카메라를 연결한다.

var config: MatchConfig
var map: MapData
var player_hero: Hero = null
var player_controller: PlayerController = null
var follow_target: Node2D = null
## 이어 하기로 연 전투인지
var resumed := false
## 자동 저장 간격(초, 경기 시간 기준)
const AUTOSAVE_INTERVAL := 15.0
var _autosave_left := AUTOSAVE_INTERVAL

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
	arena.build(map)
	hero_manager.setup(world, map)
	ai_manager.setup(config.difficulty, hero_manager)
	var center := map.size * 0.5
	var seed_base := 0
	if GameManager.dev_args.has("seed"):
		seed_base = int(GameManager.dev_args["seed"])
	for team in [Enums.Team.BLUE, Enums.Team.RED]:
		var ids: PackedStringArray = config.blue_heroes if team == Enums.Team.BLUE else config.red_heroes
		for i in ids.size():
			var data := DataRegistry.hero(ids[i])
			if data == null:
				push_error("영웅 데이터가 없습니다: " + ids[i])
				continue
			var h := hero_manager.spawn(data, team, i)
			var is_player: bool = team == Enums.Team.BLUE and i == config.player_index
			if is_player and not config.autoplay:
				player_controller = PlayerController.new()
				player_controller.name = "PlayerController"
				h.set_controller(player_controller)
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
	UnitVisual.viewer_team = player_hero.team if player_hero != null else Enums.Team.BLUE
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
	if GameManager.dev_args.has("open_shop") and player_hero != null:
		# 개발용: 상점 화면 확인. 아이템 몇 개를 미리 산 상태로 연다.
		player_hero.gold = 3000
		for id in ["dagger", "health_potion", "health_potion", "old_boots"]:
			shop_manager.buy(player_hero, id)
		if GameManager.dev_args["open_shop"] != "closed":
			hud.toggle_shop()
			hud.shop_panel._select_item(ItemManager.get_item("hero_sword"))


## 이어 하기용으로 전투를 저장한다. 끝난 경기와 시험용 자동 진행 경기는 저장하지 않는다.
func can_save() -> bool:
	return battle_manager != null and not battle_manager.match_over and config != null and not config.autoplay


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
		var z := minf(vp.x / (map.size.x + 200.0), vp.y / (map.size.y + 200.0))
		camera.zoom = Vector2(z, z)
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
	if follow_target != null and is_instance_valid(follow_target):
		camera.global_position = follow_target.global_position


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
