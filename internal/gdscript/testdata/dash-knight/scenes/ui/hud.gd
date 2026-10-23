extends CanvasLayer

@export var player: Player

@onready var health_bar: ProgressBar = %HealthBar
@onready var stamina_bar: ProgressBar = %StaminaBar


func _ready() -> void:
    player.health_changed.connect(_on_health_changed)
    player.stamina.stamina_changed.connect(_on_stamina_changed)


func _on_health_changed(current: int, maximum: int) -> void:
    _update_bar(health_bar, current, maximum)


func _on_stamina_changed(current: float, maximum: float) -> void:
    _update_bar(stamina_bar, current, maximum)


func _update_bar(bar: ProgressBar, current: float, maximum: float) -> void:
    bar.max_value = maximum
    bar.value = current
