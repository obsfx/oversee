class_name Player
extends CharacterBody2D

signal health_changed(current: int, maximum: int)
signal died

const SPEED := 180.0
const DASH_SPEED := 520.0
const DASH_TIME := 0.18

@export var max_health := 5

@onready var stamina: Stamina = $Stamina
@onready var sprite: AnimatedSprite2D = $Sprite

var health := max_health
var _dash_left := 0.0
var _input_dir := Vector2.ZERO


func _physics_process(delta: float) -> void:
    _read_input()
    if Input.is_action_just_pressed("dash"):
        _try_dash()
    _apply_movement(delta)


func _read_input() -> void:
    _input_dir = Input.get_vector("move_left", "move_right", "move_up", "move_down")


func _try_dash() -> void:
    if _dash_left > 0.0 or _input_dir == Vector2.ZERO:
        return
    if not stamina.consume(Stamina.DASH_COST):
        return
    _dash_left = DASH_TIME
    sprite.play("dash")
    GameState.register_dash()


func _apply_movement(delta: float) -> void:
    var speed := DASH_SPEED if _dash_left > 0.0 else SPEED
    _dash_left = maxf(_dash_left - delta, 0.0)
    velocity = _input_dir * speed
    move_and_slide()


func take_damage(amount: int) -> void:
    if _dash_left > 0.0:
        return
    health = maxi(health - amount, 0)
    health_changed.emit(health, max_health)
    if health == 0:
        _die()


func _die() -> void:
    set_physics_process(false)
    sprite.play("die")
    GameState.save_stats()
    died.emit()


func _on_hurtbox_area_entered(area: Area2D) -> void:
    if area.is_in_group("hazard"):
        take_damage(1)
