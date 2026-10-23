package gdscript

import (
	"os"
	"reflect"
	"testing"
)

func TestParseSceneOfGodot4(t *testing.T) {
	content, err := os.ReadFile("testdata/dash-knight/scenes/player/player.tscn")
	if err != nil {
		t.Fatal(err)
	}

	scene := ParseScene(content)

	wantNodes := map[string]SceneNode{
		".":             {Name: "Player", Script: "res://scenes/player/player.gd"},
		"Sprite":        {Name: "Sprite"},
		"Stamina":       {Name: "Stamina", Script: "res://scripts/components/stamina.gd"},
		"Hurtbox":       {Name: "Hurtbox"},
		"Hurtbox/Shape": {Name: "Shape"},
	}
	if !reflect.DeepEqual(scene.Nodes, wantNodes) {
		t.Fatalf("nodes %+v, want %+v", scene.Nodes, wantNodes)
	}
	wantConnections := []SceneConnection{{Signal: "area_entered", From: "Hurtbox", To: ".", Method: "_on_hurtbox_area_entered", Line: 24}}
	if !reflect.DeepEqual(scene.Connections, wantConnections) {
		t.Fatalf("connections = %+v, want %+v", scene.Connections, wantConnections)
	}
}

func TestParseSceneOfGodot3(t *testing.T) {
	scene := ParseScene([]byte(`[gd_scene load_steps=3 format=2]

[ext_resource path="res://main.gd" type="Script" id=1]
[ext_resource path="res://ui/menu.tscn" type="PackedScene" id=2]

[node name="Main" type="Node2D"]
script = ExtResource( 1 )

[node name="Menu" parent="." instance=ExtResource( 2 )]

[node name="Panel" type="Panel" parent="Menu"]

[node name="Button" type="Button" parent="Menu/Panel"]

[connection signal="pressed" from="Menu/Panel/Button" to="." method="_on_button_pressed" binds= [ 1 ]]
`))

	wantNodes := map[string]SceneNode{
		".":                 {Name: "Main", Script: "res://main.gd"},
		"Menu":              {Name: "Menu", Instance: "res://ui/menu.tscn"},
		"Menu/Panel":        {Name: "Panel"},
		"Menu/Panel/Button": {Name: "Button"},
	}
	if !reflect.DeepEqual(scene.Nodes, wantNodes) {
		t.Fatalf("nodes %+v, want %+v", scene.Nodes, wantNodes)
	}
	wantConnections := []SceneConnection{{Signal: "pressed", From: "Menu/Panel/Button", To: ".", Method: "_on_button_pressed", Line: 15}}
	if !reflect.DeepEqual(scene.Connections, wantConnections) {
		t.Fatalf("connections = %+v, want %+v", scene.Connections, wantConnections)
	}
}

func TestSceneNodeNames(t *testing.T) {
	scene := ParseScene([]byte("[node name=\"Level\" type=\"Node\"]\n\n[node name=\"Door\" type=\"Area2D\" parent=\".\"]\n"))

	cases := map[string]string{".": "Level", "Door": "Door", "Missing/Node": "Missing/Node"}
	for nodePath, want := range cases {
		if got := scene.NodeName(nodePath); got != want {
			t.Fatalf("NodeName(%q) = %q, want %q", nodePath, got, want)
		}
	}
}
