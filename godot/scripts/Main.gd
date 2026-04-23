extends Node2D

## Runner tuned to match web `src/App.tsx` (Hungry G Runner).

const SCREEN_WIDTH := 980.0
const SCREEN_HEIGHT := 700.0
const WORLD_WIDTH := 980.0
const GROUND_Y := 330.0
const PLAYER_X := 170.0
const PLAYER_WIDTH := 52.0
const PLAYER_HEIGHT := 82.0
const PLAYER_CENTER_X := PLAYER_X + PLAYER_WIDTH * 0.5
const RUN_SPEED := 320.0
const DAMAGE_COOLDOWN := 0.85
const FIRE_HITBOX_LEFT_OFFSET := -20.0
const FIRE_HITBOX_WIDTH := 96.0
const FIRE_HITBOX_TOP_OFFSET := -88.0
const FIRE_HITBOX_HEIGHT := 96.0
const SCENERY_WRAP_WIDTH := WORLD_WIDTH

var score: int = 0
var ramen_count: int = 0
var lives: int = 3
var is_game_over: bool = false
var is_running: bool = true
var _damage_timer: float = 0.0
var _spawn_timer: float = 0.65
var _scenery_offset: float = 0.0
var _show_fall_popup: bool = false

var _obstacles: Array[Dictionary] = []
var _holes: Array[Dictionary] = []
var _ramen_pickups: Array[Dictionary] = []

@onready var _player = $Player
@onready var _score_label: Label = $HUD/Panel/ScoreLabel
@onready var _lives_label: Label = $HUD/Panel/LivesLabel
@onready var _state_label: Label = $HUD/Panel/StateLabel
@onready var _help_label: Label = $HUD/Panel/HelpLabel
@onready var _run_toggle_button: Button = $HUD/RunToggleButton
@onready var _bgm: AudioStreamPlayer = $Audio/BGM
@onready var _sfx_jump: AudioStreamPlayer = $Audio/SfxJump
@onready var _sfx_hit: AudioStreamPlayer = $Audio/SfxHit
@onready var _sfx_ramen: AudioStreamPlayer = $Audio/SfxRamen


func _ready() -> void:
	randomize()
	_player.ground_y = GROUND_Y
	_player.position = Vector2(PLAYER_CENTER_X, GROUND_Y)
	_player.jumped.connect(_on_player_jumped)
	_run_toggle_button.pressed.connect(_on_run_toggle_pressed)
	_ensure_audio_streams()
	if _bgm and _bgm.stream:
		var ogg := _bgm.stream as AudioStreamOggVorbis
		if ogg:
			ogg.loop = true
	else:
		push_error("Hungry G: BGM stream missing (expected res://assets/audio/bgm_ambient.ogg).")
	_reset_game_state()
	call_deferred("_start_audio_after_ready")


func _ensure_audio_streams() -> void:
	if _bgm and _bgm.stream == null:
		_bgm.stream = load("res://assets/audio/bgm_ambient.ogg") as AudioStream
	if _sfx_jump and _sfx_jump.stream == null:
		_sfx_jump.stream = load("res://assets/audio/sfx_jump.ogg") as AudioStream
	if _sfx_hit and _sfx_hit.stream == null:
		_sfx_hit.stream = load("res://assets/audio/sfx_day_complete.ogg") as AudioStream
	if _sfx_ramen and _sfx_ramen.stream == null:
		_sfx_ramen.stream = load("res://assets/audio/sfx_stamp.ogg") as AudioStream


func _start_audio_after_ready() -> void:
	var master_idx := AudioServer.get_bus_index("Master")
	if master_idx >= 0:
		AudioServer.set_bus_mute(master_idx, false)
	_sync_bgm_with_running()


func _sync_bgm_with_running() -> void:
	if not _bgm:
		return
	if is_running:
		if not _bgm.playing:
			_bgm.play()
	else:
		if _bgm.playing:
			_bgm.stop()


func _process(delta: float) -> void:
	if _show_fall_popup and _damage_timer <= 0.3:
		_show_fall_popup = false

	if is_game_over:
		if Input.is_key_pressed(KEY_R):
			_reset_game_state()
		_refresh_ui()
		queue_redraw()
		return

	if not is_running:
		_refresh_ui()
		queue_redraw()
		return

	_damage_timer = max(_damage_timer - delta, 0.0)
	_spawn_timer -= delta
	score += int(120.0 * delta)
	_scenery_offset += RUN_SPEED * delta
	if _scenery_offset >= SCENERY_WRAP_WIDTH:
		_scenery_offset -= SCENERY_WRAP_WIDTH

	if _spawn_timer <= 0.0:
		_spawn_lane_object()
		_spawn_timer = 0.75 + randf() * 0.85

	_move_world_objects(delta)
	_check_collisions()
	_refresh_ui()
	queue_redraw()


func _draw() -> void:
	draw_rect(Rect2(0.0, 0.0, SCREEN_WIDTH, GROUND_Y), Color(0.57, 0.84, 1.0, 1.0), true)
	_draw_scenery_chunk(-_scenery_offset)
	_draw_scenery_chunk(SCENERY_WRAP_WIDTH - _scenery_offset)
	draw_rect(Rect2(0.0, GROUND_Y, SCREEN_WIDTH, SCREEN_HEIGHT - GROUND_Y), Color(0.2, 0.2, 0.2, 1.0), true)
	draw_string(ThemeDB.fallback_font, Vector2(18, 34), "🍜 x %d" % ramen_count, HORIZONTAL_ALIGNMENT_LEFT, -1, 28, Color(0.06, 0.1, 0.16, 1.0))

	for hole in _holes:
		var x := float(hole.get("x", 0.0))
		var width := float(hole.get("width", 130.0))
		draw_rect(Rect2(x, GROUND_Y, width, 220.0), Color(0.03, 0.03, 0.03, 1.0), true)

	for obstacle in _obstacles:
		var x := float(obstacle.get("x", 0.0))
		var h := float(obstacle.get("height", 56.0))
		var fs := int(clamp(h * 0.8, 24.0, 72.0))
		draw_string(ThemeDB.fallback_font, Vector2(x, GROUND_Y - 10.0), "🔥", HORIZONTAL_ALIGNMENT_LEFT, -1, fs, Color(1, 1, 1, 1))

	for ramen in _ramen_pickups:
		var ramen_x := float(ramen.get("x", 0.0))
		var ramen_y := float(ramen.get("y", 0.0))
		draw_string(ThemeDB.fallback_font, Vector2(ramen_x, ramen_y), "🍜", HORIZONTAL_ALIGNMENT_LEFT, -1, 38, Color(1, 1, 1, 1))

	if _show_fall_popup:
		var popup := Rect2(26.0, 62.0, 260.0, 132.0)
		draw_rect(popup, Color(0.07, 0.09, 0.14, 0.95), true)
		draw_rect(popup, Color(0.96, 0.44, 0.44, 1.0), false, 2.0)
		draw_string(ThemeDB.fallback_font, popup.position + Vector2(24, 48), "😵 Fell into a hole!", HORIZONTAL_ALIGNMENT_LEFT, -1, 26, Color(0.98, 0.75, 0.75, 1))
		draw_string(ThemeDB.fallback_font, popup.position + Vector2(92, 90), "-1 life", HORIZONTAL_ALIGNMENT_LEFT, -1, 20, Color(0.95, 0.95, 0.95, 1))

	if is_game_over:
		var game_over_popup := Rect2(300.0, 92.0, 360.0, 144.0)
		draw_rect(game_over_popup, Color(0.07, 0.09, 0.14, 0.95), true)
		draw_rect(game_over_popup, Color(0.96, 0.44, 0.44, 1.0), false, 2.0)
		draw_string(ThemeDB.fallback_font, game_over_popup.position + Vector2(78, 54), "GAME OVER", HORIZONTAL_ALIGNMENT_LEFT, -1, 34, Color(0.98, 0.75, 0.75, 1))
		draw_string(ThemeDB.fallback_font, game_over_popup.position + Vector2(82, 98), "Press R to restart", HORIZONTAL_ALIGNMENT_LEFT, -1, 24, Color(0.95, 0.95, 0.95, 1))


func _spawn_lane_object() -> void:
	var spawn_x := WORLD_WIDTH + 40.0 + randf() * 120.0
	var roll := randf()

	if roll < 0.47:
		_obstacles.append({
			"x": spawn_x,
			"width": 42.0 + randf() * 36.0,
			"height": 42.0 + randf() * 48.0,
		})
	elif roll < 0.76:
		_holes.append({
			"x": spawn_x,
			"width": 90.0 + randf() * 70.0,
		})
	else:
		for i in 3:
			_ramen_pickups.append({
				"x": spawn_x + i * 46.0,
				"y": 160.0 + randf() * 96.0,
				"collected": false,
			})


func _move_world_objects(delta: float) -> void:
	for obstacle in _obstacles:
		obstacle["x"] = float(obstacle.get("x", 0.0)) - RUN_SPEED * delta
	for hole in _holes:
		hole["x"] = float(hole.get("x", 0.0)) - RUN_SPEED * delta
	for ramen in _ramen_pickups:
		ramen["x"] = float(ramen.get("x", 0.0)) - RUN_SPEED * delta

	_obstacles = _obstacles.filter(func(item: Dictionary) -> bool:
		return float(item.get("x", -999.0)) + float(item.get("width", 0.0)) > -50.0
	)
	_holes = _holes.filter(func(item: Dictionary) -> bool:
		return float(item.get("x", -999.0)) + float(item.get("width", 0.0)) > -50.0
	)
	_ramen_pickups = _ramen_pickups.filter(func(item: Dictionary) -> bool:
		return float(item.get("x", -999.0)) > -40.0 and not bool(item.get("collected", false))
	)


func _check_collisions() -> void:
	var px: float = _player.position.x
	var py: float = _player.position.y
	var player_left: float = PLAYER_X
	var player_right: float = PLAYER_X + PLAYER_WIDTH
	var player_top: float = py - PLAYER_HEIGHT
	var player_bottom: float = py
	var player_hit_left: float = player_left + 10.0
	var player_hit_right: float = player_right - 10.0
	var on_ground: bool = _player.is_grounded

	for obstacle in _obstacles:
		var x := float(obstacle.get("x", 0.0))
		var fire_left := x + FIRE_HITBOX_LEFT_OFFSET
		var fire_right := fire_left + FIRE_HITBOX_WIDTH
		var fire_top := GROUND_Y + FIRE_HITBOX_TOP_OFFSET
		var fire_bottom := fire_top + FIRE_HITBOX_HEIGHT
		var overlap_x := player_right > fire_left and player_left < fire_right
		var overlap_y := player_bottom > fire_top and player_top < fire_bottom
		if overlap_x and overlap_y:
			_apply_damage(false)
			break

	for hole in _holes:
		var hx := float(hole.get("x", 0.0))
		var hole_width := float(hole.get("width", 130.0))
		var over_hole := player_hit_right > hx + 10.0 and player_hit_left < (hx + hole_width - 10.0)
		if over_hole and on_ground:
			_apply_damage(true)
			break

	for ramen in _ramen_pickups:
		var rx := float(ramen.get("x", 0.0))
		var ry := float(ramen.get("y", 0.0))
		if abs(rx - (PLAYER_X + 20.0)) < 35.0 and abs(ry - player_top) < 55.0:
			ramen["collected"] = true
			score += 1000
			ramen_count += 1
			if _sfx_ramen:
				_sfx_ramen.play()


func _apply_damage(from_hole: bool) -> void:
	if _damage_timer > 0.0:
		return
	_damage_timer = DAMAGE_COOLDOWN
	lives -= 1
	if _sfx_hit:
		_sfx_hit.play()
	if from_hole:
		_show_fall_popup = true
	if lives <= 0:
		lives = 0
		is_game_over = true
	_sync_bgm_with_running()
	_refresh_ui()


func _refresh_ui() -> void:
	_score_label.text = "Score: %d" % score
	_lives_label.text = "Lives: %d" % lives
	if is_game_over:
		_state_label.text = "GAME OVER"
	elif is_running:
		_state_label.text = "RUN!"
	else:
		_state_label.text = "PAUSED"
	_help_label.text = "Tier: %s" % _get_ramen_tier()
	_run_toggle_button.text = "⏸️" if is_running else "▶️"


func _reset_game_state() -> void:
	score = 0
	ramen_count = 0
	lives = 3
	is_game_over = false
	is_running = true
	_damage_timer = 0.0
	_spawn_timer = 0.65
	_scenery_offset = 0.0
	_show_fall_popup = false
	_obstacles.clear()
	_holes.clear()
	_ramen_pickups.clear()
	_player.reset_player()
	_player.position = Vector2(PLAYER_CENTER_X, GROUND_Y)
	_player.set_physics_process(true)
	_sync_bgm_with_running()
	_refresh_ui()
	queue_redraw()


func _on_player_jumped() -> void:
	if _sfx_jump:
		_sfx_jump.play()


func _on_run_toggle_pressed() -> void:
	if is_game_over:
		return
	is_running = not is_running
	_player.set_physics_process(is_running)
	_sync_bgm_with_running()
	_refresh_ui()


func _get_ramen_tier() -> String:
	if ramen_count <= 9:
		return "Ramen Newbie"
	if ramen_count <= 30:
		return "Beginner"
	if ramen_count <= 60:
		return "Intermediate"
	if ramen_count <= 100:
		return "Advanced"
	return "Ramen Otaku"


func _draw_scenery_chunk(offset_x: float) -> void:
	var cloud := Color(1, 1, 1, 0.86)
	var mountain := Color(0.39, 0.46, 0.55, 0.85)
	var building := Color(0.58, 0.64, 0.72, 0.95)
	var window := Color(0.94, 0.96, 0.99, 0.36)

	draw_circle(Vector2(offset_x + 140, 68), 18, cloud)
	draw_circle(Vector2(offset_x + 165, 58), 16, cloud)
	draw_circle(Vector2(offset_x + 190, 66), 19, cloud)
	draw_circle(Vector2(offset_x + 438, 82), 18, cloud)
	draw_circle(Vector2(offset_x + 466, 70), 16, cloud)
	draw_circle(Vector2(offset_x + 492, 82), 18, cloud)
	draw_circle(Vector2(offset_x + 792, 64), 17, cloud)
	draw_circle(Vector2(offset_x + 818, 54), 16, cloud)
	draw_circle(Vector2(offset_x + 843, 64), 18, cloud)

	draw_colored_polygon(PackedVector2Array([
		Vector2(offset_x + 20, GROUND_Y), Vector2(offset_x + 140, 178), Vector2(offset_x + 260, GROUND_Y)
	]), mountain)
	draw_colored_polygon(PackedVector2Array([
		Vector2(offset_x + 250, GROUND_Y), Vector2(offset_x + 394, 154), Vector2(offset_x + 538, GROUND_Y)
	]), mountain)
	draw_colored_polygon(PackedVector2Array([
		Vector2(offset_x + 570, GROUND_Y), Vector2(offset_x + 690, 184), Vector2(offset_x + 810, GROUND_Y)
	]), mountain)

	var bh := 108.0
	_draw_building(Rect2(offset_x + 620, GROUND_Y - bh, 62, bh), building, window)
	bh = 126.0
	_draw_building(Rect2(offset_x + 690, GROUND_Y - bh, 74, bh), building, window)
	bh = 98.0
	_draw_building(Rect2(offset_x + 774, GROUND_Y - bh, 66, bh), building, window)
	bh = 112.0
	_draw_building(Rect2(offset_x + 848, GROUND_Y - bh, 58, bh), building, window)


func _draw_building(rect: Rect2, body_color: Color, window_color: Color) -> void:
	draw_rect(rect, body_color, true)
	draw_rect(Rect2(rect.position.x, rect.position.y + rect.size.y - 20.0, rect.size.x, 20.0), Color(0.2, 0.26, 0.33, 0.35), true)
	for y in range(0, int(rect.size.y - 22.0), 14):
		for x in range(0, int(rect.size.x - 10.0), 12):
			draw_rect(Rect2(rect.position + Vector2(6 + x, 8 + y), Vector2(6, 8)), window_color, true)
