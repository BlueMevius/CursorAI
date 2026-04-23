extends Node2D

signal loading_state_changed(loaded: int, total: int, failed: int, pending: int)

const WORLD_TO_PIXELS := 20.0

@export var zoom: int = 12
@export var use_remote_fallback: bool = true
@export var local_tile_root: String = "res://assets/map/osm-tiles"
@export var remote_template: String = "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
@export var max_concurrent_requests: int = 6

var _tile_nodes: Dictionary = {}
var _pending: Dictionary = {}
var _remote_queue: Array[Dictionary] = []
var _total_tiles: int = 0
var _loaded_tiles: int = 0
var _failed_tiles: int = 0
var _resolved: Dictionary = {}


func _ready() -> void:
	_render_tokyo_tile_grid()


func _process(_delta: float) -> void:
	_drain_remote_queue()


func _render_tokyo_tile_grid() -> void:
	var r := OSMTileService.get_tokyo_tile_range(zoom)
	for x in range(r.x_min, r.x_max + 1):
		for y in range(r.y_min, r.y_max + 1):
			_total_tiles += 1
			_create_tile_placeholder(x, y)
			_try_load_tile_texture(x, y)
	_emit_loading_state()


func _create_tile_placeholder(tile_x: int, tile_y: int) -> void:
	var key := _tile_key(tile_x, tile_y)
	if _tile_nodes.has(key):
		return

	var center_world := OSMTileService.tile_center_world(tile_x, tile_y, zoom)
	var sprite := Sprite2D.new()
	sprite.centered = true
	sprite.position = _world_to_canvas(center_world)
	sprite.modulate = Color(0.12, 0.17, 0.25, 1.0)
	sprite.texture = _fallback_texture()
	add_child(sprite)
	_tile_nodes[key] = sprite


func _try_load_tile_texture(tile_x: int, tile_y: int) -> void:
	var local_path := "%s/%d/%d/%d.png" % [local_tile_root, zoom, tile_x, tile_y]
	if ResourceLoader.exists(local_path):
		var tex := load(local_path) as Texture2D
		if tex:
			_set_tile_texture(tile_x, tile_y, tex)
			return

	if not use_remote_fallback:
		_mark_failed(tile_x, tile_y)
		return
	_remote_queue.append({"x": tile_x, "y": tile_y})
	_drain_remote_queue()


func _request_remote_tile(tile_x: int, tile_y: int) -> void:
	var key := _tile_key(tile_x, tile_y)
	if _pending.has(key):
		return

	var req := HTTPRequest.new()
	req.timeout = 10.0
	add_child(req)
	_pending[key] = req
	req.request_completed.connect(_on_tile_request_completed.bind(tile_x, tile_y, req))
	var url := remote_template.format({
		"z": str(zoom),
		"x": str(tile_x),
		"y": str(tile_y),
	})
	var err := req.request(url)
	if err != OK:
		_pending.erase(key)
		req.queue_free()
		_mark_failed(tile_x, tile_y)
	_emit_loading_state()


func _drain_remote_queue() -> void:
	while _pending.size() < max_concurrent_requests and not _remote_queue.is_empty():
		var next: Dictionary = _remote_queue.pop_front()
		_request_remote_tile(int(next.get("x", 0)), int(next.get("y", 0)))


func _on_tile_request_completed(result: int, response_code: int, _headers: PackedStringArray, body: PackedByteArray, tile_x: int, tile_y: int, req: HTTPRequest) -> void:
	var key := _tile_key(tile_x, tile_y)
	_pending.erase(key)
	req.queue_free()
	_emit_loading_state()

	if result != HTTPRequest.RESULT_SUCCESS or response_code != 200:
		_mark_failed(tile_x, tile_y)
		return

	var image := Image.new()
	var err := image.load_png_from_buffer(body)
	if err != OK:
		_mark_failed(tile_x, tile_y)
		return

	var tex := ImageTexture.create_from_image(image)
	_set_tile_texture(tile_x, tile_y, tex)


func _set_tile_texture(tile_x: int, tile_y: int, texture: Texture2D) -> void:
	var key := _tile_key(tile_x, tile_y)
	if not _tile_nodes.has(key):
		return
	var sprite := _tile_nodes[key] as Sprite2D
	sprite.texture = texture
	sprite.modulate = Color(1, 1, 1, 1)
	if not _resolved.has(key):
		_resolved[key] = true
		_loaded_tiles += 1
	_emit_loading_state()


func _world_to_canvas(world_pos: Vector2) -> Vector2:
	return Vector2(640, 420) + world_pos * WORLD_TO_PIXELS


func _tile_key(tile_x: int, tile_y: int) -> String:
	return "%d_%d_%d" % [zoom, tile_x, tile_y]


func _fallback_texture() -> Texture2D:
	var image := Image.create(OSMTileService.TILE_SIZE, OSMTileService.TILE_SIZE, false, Image.FORMAT_RGBA8)
	image.fill(Color(0.12, 0.17, 0.25, 1.0))
	return ImageTexture.create_from_image(image)


func _mark_failed(tile_x: int, tile_y: int) -> void:
	var key := _tile_key(tile_x, tile_y)
	if _resolved.has(key):
		return
	_resolved[key] = true
	_failed_tiles += 1
	_emit_loading_state()


func _emit_loading_state() -> void:
	loading_state_changed.emit(_loaded_tiles, _total_tiles, _failed_tiles, _pending.size())

