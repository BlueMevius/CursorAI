extends RefCounted
class_name GeoProjection

const BASE_LAT := 35.681236
const BASE_LNG := 139.767125
const METERS_PER_DEG_LAT := 111320.0
const WORLD_SCALE := 1.0 / 180.0


static func lat_lng_to_world(lat: float, lng: float) -> Vector2:
	var meters_per_deg_lng := METERS_PER_DEG_LAT * cos(deg_to_rad(BASE_LAT))
	var x := (lng - BASE_LNG) * meters_per_deg_lng * WORLD_SCALE
	var z := -((lat - BASE_LAT) * METERS_PER_DEG_LAT * WORLD_SCALE)
	return Vector2(x, z)
