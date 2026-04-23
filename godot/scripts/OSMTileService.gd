extends RefCounted
class_name OSMTileService

const TILE_SIZE := 256
const DEFAULT_ZOOM := 12


static func lng_to_tile_x(lng: float, zoom: int) -> float:
	return ((lng + 180.0) / 360.0) * pow(2.0, zoom)


static func lat_to_tile_y(lat: float, zoom: int) -> float:
	var rad := deg_to_rad(lat)
	return ((1.0 - log(tan(rad) + (1.0 / cos(rad))) / PI) / 2.0) * pow(2.0, zoom)


static func tile_x_to_lng(tile_x: float, zoom: int) -> float:
	return (tile_x / pow(2.0, zoom)) * 360.0 - 180.0


static func tile_y_to_lat(tile_y: float, zoom: int) -> float:
	var n := PI - (2.0 * PI * tile_y) / pow(2.0, zoom)
	return rad_to_deg(atan(sinh(n)))


static func get_tokyo_tile_range(zoom: int = DEFAULT_ZOOM) -> Dictionary:
	var min_lat := 35.52
	var max_lat := 35.84
	var min_lng := 139.55
	var max_lng := 139.95

	var x_min := int(floor(lng_to_tile_x(min_lng, zoom)))
	var x_max := int(floor(lng_to_tile_x(max_lng, zoom)))
	var y_min := int(floor(lat_to_tile_y(max_lat, zoom)))
	var y_max := int(floor(lat_to_tile_y(min_lat, zoom)))

	return {
		"x_min": x_min,
		"x_max": x_max,
		"y_min": y_min,
		"y_max": y_max,
	}


static func tile_center_world(tile_x: int, tile_y: int, zoom: int) -> Vector2:
	var west_lng := tile_x_to_lng(tile_x, zoom)
	var east_lng := tile_x_to_lng(tile_x + 1, zoom)
	var north_lat := tile_y_to_lat(tile_y, zoom)
	var south_lat := tile_y_to_lat(tile_y + 1, zoom)

	var nw := GeoProjection.lat_lng_to_world(north_lat, west_lng)
	var se := GeoProjection.lat_lng_to_world(south_lat, east_lng)
	return (nw + se) * 0.5

