extends Area2D

@export var damage := 1
@export var knockback := 140.0


func _on_body_entered(body: Node2D) -> void:
    if body is Player:
        body.take_damage(damage)
        _bounce_away(body)


func _bounce_away(body: Node2D) -> void:
    var away := (global_position - body.global_position).normalized()
    position += away * knockback * 0.1
