class_name Player
extends CharacterBody2D

signal health_changed(current: int, maximum: int)
signal died

const SPEED := 180.0
const ROLL_SPEED := 320.0

@export var max_health := 5

@onready var sprite: AnimatedSprite2D = $Sprite

var health := max_health
var _rolling := false


func _physics_process(_delta: float) -> void:
    var direction := Input.get_vector("move_left", "move_right", "move_up", "move_down")
    if Input.is_action_just_pressed("roll"):
        _legacy_roll(direction)
        return
    velocity = direction * SPEED
    move_and_slide()


func _legacy_roll(direction: Vector2) -> void:
    _rolling = true
    velocity = direction * ROLL_SPEED
    move_and_slide()
    _rolling = false


func take_damage(amount: int) -> void:
    health = maxi(health - amount, 0)
    health_changed.emit(health, max_health)
    if health == 0:
        died.emit()
