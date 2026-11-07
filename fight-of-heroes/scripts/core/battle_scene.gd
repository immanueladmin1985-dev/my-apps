extends Node2D
## 전투 화면. 경기 설정을 읽어 맵과 영웅을 만들고, 조작기·HUD·카메라를 연결한다.

var config: MatchConfig
var map: MapData
var player_hero: Hero = null
var player_controller: PlayerController = null
var follow_target: Node2D = null

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
				ai_manager.set_player(team, h)
				h.get_node("Visual").is_player = true
	follow_target = player_hero if player_hero != null else (hero_manager.heroes[0] if not hero_manager.heroes.is_empty() else null)
	battle_manager.setup(config)
	monster_manager.setup(world, map, config)
	boss_manager.setup(battle_manager, hero_manager, monster_manager)
	experience_manager.setup(hero_manager)
	ai_manager.monster_manager = monster_manager
	camera.limit_left = int(-80)
	camera.limit_top = int(-80)
	camera.limit_right = int(map.size.x + 80)
	camera.limit_bottom = int(map.size.y + 80)
	if follow_target != null:
		camera.global_position = follow_target.global_position
		camera.reset_smoothing()
	$AimIndicator.setup(player_hero, player_controller)
	hud.setup(player_hero, player_controller, battle_manager)
	hud.setup_overview(map, hero_manager, camera, monster_manager)


func _process(_delta: float) -> void:
	if GameManager.dev_args.has("follow_boss"):
		var b := get_tree().get_first_node_in_group("bosses")
		if b != null:
			follow_target = b
	if follow_target != null and is_instance_valid(follow_target):
		camera.global_position = follow_target.global_position
