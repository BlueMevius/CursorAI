extends Node2D
class_name PlayerController

signal jumped

@export var gravity: float = 2100.0
@export var jump_velocity: float = -850.0
@export var ground_y: float = 330.0

var velocity_y: float = 0.0
var is_grounded: bool = true
var _jump_latch: bool = false


func _physics_process(delta: float) -> void:
	if _wants_to_jump() and is_grounded:
		velocity_y = jump_velocity
		is_grounded = false
		jumped.emit()

	velocity_y += gravity * delta
	position.y += velocity_y * delta

	if position.y >= ground_y:
		position.y = ground_y
		velocity_y = 0.0
		is_grounded = true


func _wants_to_jump() -> bool:
	var jump_down := Input.is_key_pressed(KEY_SPACE) or Input.is_mouse_button_pressed(MOUSE_BUTTON_LEFT)
	var wants_jump := jump_down and not _jump_latch
	_jump_latch = jump_down
	return wants_jump


func reset_player() -> void:
	velocity_y = 0.0
	is_grounded = true
	_jump_latch = false
	position.y = ground_y
