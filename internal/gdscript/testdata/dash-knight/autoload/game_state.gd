extends Node

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
