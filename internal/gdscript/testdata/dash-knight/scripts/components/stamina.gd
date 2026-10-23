class_name Stamina
extends Node

signal stamina_changed(current: float, maximum: float)

const DASH_COST := 30.0

@export var maximum := 100.0
@export var regen_per_second := 25.0

var current := maximum


func _process(delta: float) -> void:
    if current < maximum:
        regenerate(regen_per_second * delta)


func consume(amount: float) -> bool:
    if current < amount:
        return false
    current -= amount
    stamina_changed.emit(current, maximum)
    return true


func regenerate(amount: float) -> void:
    current = minf(current + amount, maximum)
    stamina_changed.emit(current, maximum)
