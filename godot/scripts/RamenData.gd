extends RefCounted
class_name RamenData


static func load_itinerary(path: String = "res://data/ramen_itinerary.json") -> Dictionary:
	if not FileAccess.file_exists(path):
		push_error("Itinerary file not found: %s" % path)
		return {}

	var file := FileAccess.open(path, FileAccess.READ)
	if file == null:
		push_error("Failed to open itinerary file: %s" % path)
		return {}

	var raw := file.get_as_text()
	var parsed := JSON.parse_string(raw)
	if typeof(parsed) != TYPE_DICTIONARY:
		push_error("Invalid itinerary JSON format")
		return {}

	return parsed


static func flatten_restaurants(data: Dictionary) -> Array[Dictionary]:
	var flat: Array[Dictionary] = []
	var days: Array = data.get("days", [])
	for day_block in days:
		if typeof(day_block) != TYPE_DICTIONARY:
			continue
		var day := int(day_block.get("day", 0))
		var restaurants: Array = day_block.get("restaurants", [])
		for restaurant in restaurants:
			if typeof(restaurant) != TYPE_DICTIONARY:
				continue
			var row := restaurant.duplicate()
			row["day"] = day
			flat.append(row)
	return flat
