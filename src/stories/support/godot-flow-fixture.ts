import type {
  CallFlowChange,
  CallFlowEdge,
  CallFlowGraph,
  CallFlowKind,
  CallFlowNode,
  CallFlowOrigin,
} from '@/src/lib/call-flow.ts'
import { FlowFixtureFiles, type FlowFixtureFile } from '@/src/stories/support/flow-fixture-files.ts'

const PLAYER_OLD = `class_name Player
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
`

const PLAYER_NEW = `class_name Player
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
`

const PLAYER_SCENE_OLD = `[gd_scene load_steps=3 format=3 uid="uid://b6player"]

[ext_resource type="Script" path="res://scenes/player/player.gd" id="1_player"]
[ext_resource type="SpriteFrames" path="res://scenes/player/player_frames.tres" id="2_frames"]

[node name="Player" type="CharacterBody2D"]
script = ExtResource("1_player")

[node name="Sprite" type="AnimatedSprite2D" parent="."]
sprite_frames = ExtResource("2_frames")
`

const PLAYER_SCENE_NEW = `[gd_scene load_steps=5 format=3 uid="uid://b6player"]

[ext_resource type="Script" path="res://scenes/player/player.gd" id="1_player"]
[ext_resource type="SpriteFrames" path="res://scenes/player/player_frames.tres" id="2_frames"]
[ext_resource type="Script" path="res://scripts/components/stamina.gd" id="3_stamina"]

[sub_resource type="CircleShape2D" id="CircleShape2D_hurt"]
radius = 9.0

[node name="Player" type="CharacterBody2D"]
script = ExtResource("1_player")

[node name="Sprite" type="AnimatedSprite2D" parent="."]
sprite_frames = ExtResource("2_frames")

[node name="Stamina" type="Node" parent="."]
script = ExtResource("3_stamina")

[node name="Hurtbox" type="Area2D" parent="."]

[node name="Shape" type="CollisionShape2D" parent="Hurtbox"]
shape = SubResource("CircleShape2D_hurt")

[connection signal="area_entered" from="Hurtbox" to="." method="_on_hurtbox_area_entered"]
`

const STAMINA_NEW = `class_name Stamina
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
`

const HUD_OLD = `extends CanvasLayer

@export var player: Player

@onready var health_bar: ProgressBar = %HealthBar


func _ready() -> void:
    player.health_changed.connect(_on_health_changed)


func _on_health_changed(current: int, maximum: int) -> void:
    health_bar.max_value = maximum
    health_bar.value = current
`

const HUD_NEW = `extends CanvasLayer

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
`

const GAME_STATE_OLD = `extends Node

const SAVE_PATH := "user://stats.cfg"

var deaths := 0


func save_stats() -> void:
    var config := ConfigFile.new()
    config.set_value("stats", "deaths", deaths)
    config.save(SAVE_PATH)
`

const GAME_STATE_NEW = `extends Node

const SAVE_PATH := "user://stats.cfg"

var deaths := 0
var dashes := 0


func register_dash() -> void:
    dashes += 1


func save_stats() -> void:
    deaths += 1
    var config := ConfigFile.new()
    config.set_value("stats", "deaths", deaths)
    config.set_value("stats", "dashes", dashes)
    config.save(SAVE_PATH)
`

const SLIME_OLD = `extends Area2D

@export var damage := 1


func _on_body_entered(body: Node2D) -> void:
    if body is Player:
        body.take_damage(damage)
        queue_free()
`

const SLIME_NEW = `extends Area2D

@export var damage := 1
@export var knockback := 140.0


func _on_body_entered(body: Node2D) -> void:
    if body is Player:
        body.take_damage(damage)
        _bounce_away(body)


func _bounce_away(body: Node2D) -> void:
    var away := (global_position - body.global_position).normalized()
    position += away * knockback * 0.1
`

const PLAYER = 'scenes/player/player.gd'
const PLAYER_SCENE = 'scenes/player/player.tscn'
const STAMINA = 'scripts/components/stamina.gd'
const HUD = 'scenes/ui/hud.gd'
const GAME_STATE = 'autoload/game_state.gd'
const SLIME = 'scenes/enemies/slime.gd'

const SOURCES: Record<string, string> = {
  [PLAYER]: PLAYER_NEW,
  [STAMINA]: STAMINA_NEW,
  [HUD]: HUD_NEW,
  [GAME_STATE]: GAME_STATE_NEW,
  [SLIME]: SLIME_NEW,
}

const CLASS_NAMES: Record<string, string> = {
  [PLAYER]: 'Player',
  [STAMINA]: 'Stamina',
  [HUD]: 'Hud',
  [GAME_STATE]: 'GameState',
  [SLIME]: 'Slime',
}

const CALLBACKS = new Set(['_ready', '_process', '_physics_process'])

export abstract class GodotFlowFixture {
  static readonly files: FlowFixtureFile[] = [
    FlowFixtureFiles.of(PLAYER, PLAYER_OLD, PLAYER_NEW),
    FlowFixtureFiles.of(PLAYER_SCENE, PLAYER_SCENE_OLD, PLAYER_SCENE_NEW),
    FlowFixtureFiles.of(STAMINA, null, STAMINA_NEW),
    FlowFixtureFiles.of(HUD, HUD_OLD, HUD_NEW),
    FlowFixtureFiles.of(GAME_STATE, GAME_STATE_OLD, GAME_STATE_NEW),
    FlowFixtureFiles.of(SLIME, SLIME_OLD, SLIME_NEW),
  ]

  static graph(): CallFlowGraph {
    const nodes: CallFlowNode[] = [
      GodotFlowFixture.node(PLAYER, '_physics_process', 'modified'),
      GodotFlowFixture.node(PLAYER, '_read_input', 'added'),
      GodotFlowFixture.node(PLAYER, '_try_dash', 'added'),
      GodotFlowFixture.node(PLAYER, '_apply_movement', 'added'),
      GodotFlowFixture.node(PLAYER, 'take_damage', 'modified'),
      GodotFlowFixture.node(PLAYER, '_die', 'added'),
      GodotFlowFixture.node(PLAYER, '_on_hurtbox_area_entered', 'added'),
      GodotFlowFixture.removed(PLAYER, '_legacy_roll', PLAYER_OLD),
      GodotFlowFixture.node(STAMINA, '_process', 'added'),
      GodotFlowFixture.node(STAMINA, 'consume', 'added'),
      GodotFlowFixture.node(STAMINA, 'regenerate', 'added'),
      GodotFlowFixture.node(HUD, '_ready', 'modified'),
      GodotFlowFixture.node(HUD, '_on_health_changed', 'modified'),
      GodotFlowFixture.node(HUD, '_on_stamina_changed', 'added'),
      GodotFlowFixture.node(HUD, '_update_bar', 'added'),
      GodotFlowFixture.node(GAME_STATE, 'register_dash', 'added'),
      GodotFlowFixture.node(GAME_STATE, 'save_stats', 'modified'),
      GodotFlowFixture.node(SLIME, '_on_body_entered', 'modified'),
      GodotFlowFixture.node(SLIME, '_bounce_away', 'added'),
    ]
    const edges: CallFlowEdge[] = [
      GodotFlowFixture.call(PLAYER, '_physics_process', PLAYER, '_read_input', '_read_input()'),
      GodotFlowFixture.call(PLAYER, '_physics_process', PLAYER, '_try_dash', '_try_dash()'),
      GodotFlowFixture.call(
        PLAYER,
        '_physics_process',
        PLAYER,
        '_apply_movement',
        '_apply_movement(',
      ),
      GodotFlowFixture.call(PLAYER, '_try_dash', STAMINA, 'consume', 'stamina.consume('),
      GodotFlowFixture.call(PLAYER, '_try_dash', GAME_STATE, 'register_dash', 'register_dash()'),
      GodotFlowFixture.call(
        PLAYER,
        'take_damage',
        HUD,
        '_on_health_changed',
        'health_changed.emit',
        {
          via: 'signal',
          label: 'health_changed',
        },
      ),
      GodotFlowFixture.call(PLAYER, 'take_damage', PLAYER, '_die', '_die()'),
      GodotFlowFixture.call(PLAYER, '_die', GAME_STATE, 'save_stats', 'save_stats()'),
      GodotFlowFixture.call(
        PLAYER,
        '_on_hurtbox_area_entered',
        PLAYER,
        'take_damage',
        'take_damage(1)',
      ),
      GodotFlowFixture.call(STAMINA, '_process', STAMINA, 'regenerate', 'regenerate('),
      GodotFlowFixture.call(
        STAMINA,
        'consume',
        HUD,
        '_on_stamina_changed',
        'stamina_changed.emit',
        {
          via: 'signal',
          label: 'stamina_changed',
        },
      ),
      GodotFlowFixture.call(
        STAMINA,
        'regenerate',
        HUD,
        '_on_stamina_changed',
        'stamina_changed.emit',
        {
          via: 'signal',
          label: 'stamina_changed',
        },
      ),
      GodotFlowFixture.call(HUD, '_ready', HUD, '_on_health_changed', 'health_changed.connect', {
        via: 'connect',
        label: 'health_changed',
      }),
      GodotFlowFixture.call(HUD, '_ready', HUD, '_on_stamina_changed', 'stamina_changed.connect', {
        via: 'connect',
        label: 'stamina_changed',
      }),
      GodotFlowFixture.call(HUD, '_on_health_changed', HUD, '_update_bar', '_update_bar('),
      GodotFlowFixture.call(HUD, '_on_stamina_changed', HUD, '_update_bar', '_update_bar('),
      GodotFlowFixture.call(
        SLIME,
        '_on_body_entered',
        PLAYER,
        'take_damage',
        'take_damage(damage)',
      ),
      GodotFlowFixture.call(SLIME, '_on_body_entered', SLIME, '_bounce_away', '_bounce_away('),
    ]
    return {
      nodes,
      edges,
      origins: {
        [GodotFlowFixture.id(PLAYER, '_physics_process')]: [
          GodotFlowFixture.note('engine calls it every physics frame'),
        ],
        [GodotFlowFixture.id(PLAYER, '_on_hurtbox_area_entered')]: [
          {
            name: 'Hurtbox.area_entered',
            path: PLAYER_SCENE,
            line: GodotFlowFixture.connectionLine(PLAYER_SCENE_NEW, 'area_entered'),
          },
        ],
        [GodotFlowFixture.id(STAMINA, '_process')]: [
          GodotFlowFixture.note('engine calls it every frame'),
        ],
        [GodotFlowFixture.id(HUD, '_ready')]: [
          GodotFlowFixture.note('engine calls it when the node enters the tree'),
        ],
        [GodotFlowFixture.id(SLIME, '_on_body_entered')]: [
          GodotFlowFixture.note('signal body_entered in slime.tscn'),
        ],
      },
    }
  }

  private static id(path: string, name: string, source = SOURCES[path]) {
    return `${path}#${GodotFlowFixture.definitionLine(source, name)}`
  }

  private static note(name: string): CallFlowOrigin {
    return { name, path: null, line: null }
  }

  private static connectionLine(scene: string, signal: string) {
    return (
      scene.split('\n').findIndex((line) => {
        return line.startsWith(`[connection signal="${signal}"`)
      }) + 1
    )
  }

  private static node(path: string, name: string, change: CallFlowChange): CallFlowNode {
    return {
      id: GodotFlowFixture.id(path, name),
      name: `${CLASS_NAMES[path]}.${name}`,
      kind: GodotFlowFixture.kindOf(name),
      path,
      line: GodotFlowFixture.definitionLine(SOURCES[path], name),
      endLine: GodotFlowFixture.definitionEnd(SOURCES[path], name),
      change,
    }
  }

  private static removed(path: string, name: string, oldSource: string): CallFlowNode {
    return {
      id: GodotFlowFixture.id(path, name, oldSource),
      name: `${CLASS_NAMES[path]}.${name}`,
      kind: GodotFlowFixture.kindOf(name),
      path,
      line: GodotFlowFixture.definitionLine(oldSource, name),
      endLine: GodotFlowFixture.definitionEnd(oldSource, name),
      change: 'removed',
    }
  }

  private static call(
    fromPath: string,
    fromName: string,
    toPath: string,
    toName: string,
    needle: string,
    options: Pick<CallFlowEdge, 'via' | 'label'> = { via: 'call', label: null },
  ): CallFlowEdge {
    const source = SOURCES[fromPath]
    return {
      from: GodotFlowFixture.id(fromPath, fromName),
      to: GodotFlowFixture.id(toPath, toName),
      line: GodotFlowFixture.lineWithin(source, fromName, needle),
      ...options,
    }
  }

  private static kindOf(name: string): CallFlowKind {
    if (CALLBACKS.has(name)) {
      return 'callback'
    }
    if (name.startsWith('_on_')) {
      return 'handler'
    }
    return 'method'
  }

  private static definitionLine(source: string, name: string) {
    const index = source.split('\n').findIndex((line) => {
      return line.startsWith(`func ${name}(`)
    })
    if (index < 0) {
      throw new Error(`func ${name} is missing from the fixture`)
    }
    return index + 1
  }

  private static definitionEnd(source: string, name: string) {
    const lines = source.split('\n')
    let end = GodotFlowFixture.definitionLine(source, name)
    for (let index = end; index < lines.length; index += 1) {
      if (lines[index].startsWith('func ')) {
        break
      }
      if (lines[index].trim() !== '') {
        end = index + 1
      }
    }
    return end
  }

  private static lineWithin(source: string, functionName: string, needle: string) {
    const lines = source.split('\n')
    const start = GodotFlowFixture.definitionLine(source, functionName)
    for (let index = start; index < lines.length; index += 1) {
      if (lines[index].startsWith('func ')) {
        break
      }
      if (lines[index].includes(needle)) {
        return index + 1
      }
    }
    throw new Error(`${needle} is missing from func ${functionName}`)
  }
}
