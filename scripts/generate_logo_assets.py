from __future__ import annotations

from collections import deque
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ZESHA = Path(__file__).resolve().parents[1]
TELEBA = ZESHA.parent / "teleba"
REFERENCE_SOURCE = ZESHA / "assets" / "teleba-logo-thick-reference.png"
CANVAS_SIZE = 1024

BRAND_RED = (154, 14, 31, 255)
BRAND_RED_LIGHT = (210, 38, 58, 255)
BRAND_RED_DEEP = (48, 2, 8, 255)
FAVICON_GOLD = (244, 213, 106, 255)
SURFACE_OUTLIER_COUNT_LIMIT = 32
SURFACE_OUTLIER_CLUSTER_LIMIT = 4


def extract_reference_foreground(reference: Image.Image) -> Image.Image:
    source = reference.convert("RGBA")
    if source.size != (CANVAS_SIZE, CANVAS_SIZE):
        source = source.resize((CANVAS_SIZE, CANVAS_SIZE), Image.Resampling.LANCZOS)

    alpha = Image.new("L", source.size, 0)
    source_pixels = source.load()
    alpha_pixels = alpha.load()
    for y in range(source.height):
        for x in range(source.width):
            r, g, b, a = source_pixels[x, y]
            if a == 0:
                continue
            brightness = max(r, g, b)
            shadow_floor = min(r, g, b)
            saturation = brightness - shadow_floor
            if brightness < 112 or saturation > 54 or shadow_floor < 78:
                continue
            coverage = 255 if brightness >= 132 and shadow_floor >= 96 else min(255, max(0, round((brightness - 112) * 12.75)))
            alpha_pixels[x, y] = coverage

    foreground = Image.new("RGBA", source.size, (218, 175, 62, 255))
    foreground.putalpha(alpha)
    return clear_transparent_rgb(foreground)


def is_red_contam(pixel: tuple[int, int, int, int]) -> bool:
    r, g, b, a = pixel
    # Exclude gold/cream family: when the pixel has warm gold character,
    # it's metallic lettermark, not red matte contamination.
    is_gold_family = (
        # Bright gold/cream: high green, proportional blue
        (g >= 140 and b >= 60 and g >= r * 0.60 and b >= g * 0.45)
        # Dark gold/brown: low blue, green tracks red
        or (g >= 55 and b < 60 and g >= r * 0.35 and r <= 200 and r - g <= 100)
        # Mid gold: moderate green and blue, warm tone
        or (g >= 100 and b >= 40 and g >= r * 0.55 and r <= 250 and r - g <= 80)
    )
    dark_tile_red = r >= 90 and g <= 40 and b <= 40 and r - g >= 55 and r - b >= 55
    dark_matte = 35 <= r <= 130 and g <= 55 and b <= 45 and r >= g + 25 and r >= b + 25
    bright_edge_red = r >= 150 and g <= 95 and b <= 100 and r - g >= 75 and r - b >= 75
    rose_matte = r >= 175 and g <= 140 and b >= 35 and r - g >= 55 and r - b >= 45 and b * 100 >= max(g, 1) * 45
    salmon_matte = r >= 220 and 100 <= g <= 180 and b >= 90 and r - g >= 55 and r - b >= 35
    peach_matte = r >= 235 and 170 <= g <= 225 and b >= 140 and r - g >= 25 and r - b >= 35
    if is_gold_family:
        return False
    return a > 0 and (dark_tile_red or dark_matte or bright_edge_red or rose_matte or salmon_matte or peach_matte)


def is_bright_red_contam(pixel: tuple[int, int, int, int]) -> bool:
    r, g, b, a = pixel
    return a > 96 and r >= 180 and g <= 95 and b <= 100 and r - g >= 110 and r - b >= 100


def is_dark_edge_matte(pixel: tuple[int, int, int, int]) -> bool:
    r, g, b, a = pixel
    return a > 0 and 35 <= r <= 130 and g <= 55 and b <= 45 and r >= g + 25 and r >= b + 25


def visible_bounds(image: Image.Image) -> tuple[int, int, int, int]:
    bounds = image.getchannel("A").getbbox()
    if bounds is None:
        raise ValueError("source has no visible pixels")
    return bounds


def nearest_non_red_fill(foreground: Image.Image) -> tuple[Image.Image, int, int]:
    rgba = foreground.convert("RGBA")
    width, height = rgba.size
    pixels = rgba.load()
    red_points: set[tuple[int, int]] = set()
    queue: deque[tuple[int, int]] = deque()

    for y in range(height):
        for x in range(width):
            pixel = pixels[x, y]
            if is_red_contam(pixel):
                red_points.add((x, y))
            elif pixel[3] > 40:
                queue.append((x, y))

    red_before = len(red_points)
    if not red_points:
        return rgba, 0, 0

    filled_from: dict[tuple[int, int], tuple[int, int, int, int]] = {
        point: pixels[point[0], point[1]] for point in queue
    }
    visited = set(queue)
    directions = ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (-1, -1), (1, -1), (-1, 1))

    while queue and red_points:
        x, y = queue.popleft()
        source_pixel = filled_from[(x, y)]
        for dx, dy in directions:
            nx, ny = x + dx, y + dy
            if nx < 0 or ny < 0 or nx >= width or ny >= height or (nx, ny) in visited:
                continue
            visited.add((nx, ny))
            if (nx, ny) in red_points:
                pixels[nx, ny] = source_pixel
                filled_from[(nx, ny)] = source_pixel
                red_points.remove((nx, ny))
                queue.append((nx, ny))
            elif pixels[nx, ny][3] > 40:
                filled_from[(nx, ny)] = pixels[nx, ny]
                queue.append((nx, ny))

    if red_points:
        for x, y in list(red_points):
            replacement = None
            for radius in range(1, max(width, height)):
                for ny in range(max(0, y - radius), min(height, y + radius + 1)):
                    for nx in range(max(0, x - radius), min(width, x + radius + 1)):
                        candidate = pixels[nx, ny]
                        if candidate[3] > 40 and not is_red_contam(candidate):
                            replacement = candidate
                            break
                    if replacement is not None:
                        break
                if replacement is not None:
                    pixels[x, y] = replacement
                    red_points.remove((x, y))
                    break

    red_after = sum(1 for y in range(height) for x in range(width) if is_red_contam(pixels[x, y]))
    return rgba, red_before, red_after


def clear_transparent_rgb(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    pixels = rgba.load()
    for y in range(rgba.height):
        for x in range(rgba.width):
            if pixels[x, y][3] == 0:
                pixels[x, y] = (0, 0, 0, 0)
    return rgba


def repair_outer_edge_matte(foreground: Image.Image) -> tuple[Image.Image, int, int]:
    rgba = foreground.convert("RGBA")
    width, height = rgba.size
    pixels = rgba.load()
    selected: set[tuple[int, int]] = set()
    top_band = min(95, height)

    for y in range(top_band):
        for x in range(width):
            if not is_dark_edge_matte(pixels[x, y]):
                continue
            touches_transparency = False
            for ny in range(max(0, y - 2), min(height, y + 3)):
                for nx in range(max(0, x - 2), min(width, x + 3)):
                    if pixels[nx, ny][3] == 0:
                        touches_transparency = True
                        break
                if touches_transparency:
                    break
            if touches_transparency:
                selected.add((x, y))

    before = len(selected)
    if not selected:
        return rgba, 0, 0

    for x, y in sorted(selected, key=lambda point: point[1]):
        replacement = None
        for radius in range(1, 48):
            for ny in range(max(0, y - radius), min(height, y + radius + 1)):
                for nx in range(max(0, x - radius), min(width, x + radius + 1)):
                    if (nx, ny) in selected:
                        continue
                    candidate = pixels[nx, ny]
                    if candidate[3] > 40 and not is_red_contam(candidate) and not is_dark_edge_matte(candidate):
                        replacement = candidate
                        break
                if replacement is not None:
                    break
            if replacement is not None:
                pixels[x, y] = replacement
                break

    after = 0
    for y in range(top_band):
        for x in range(width):
            if not is_dark_edge_matte(pixels[x, y]):
                continue
            for ny in range(max(0, y - 2), min(height, y + 3)):
                for nx in range(max(0, x - 2), min(width, x + 3)):
                    if pixels[nx, ny][3] == 0:
                        after += 1
                        break
                else:
                    continue
                break
    return rgba, before, after


def repair_alpha_scratches(foreground: Image.Image) -> tuple[Image.Image, int, int]:
    rgba = foreground.convert("RGBA")
    width, height = rgba.size
    pixels = rgba.load()

    def collect() -> set[tuple[int, int]]:
        selected: set[tuple[int, int]] = set()
        for y in range(height):
            for x in range(width):
                if pixels[x, y][3] > 40:
                    continue
                has_left = any(pixels[nx, y][3] > 180 for nx in range(max(0, x - 10), x))
                has_right = any(pixels[nx, y][3] > 180 for nx in range(x + 1, min(width, x + 11)))
                has_up = any(pixels[x, ny][3] > 180 for ny in range(max(0, y - 6), y))
                has_down = any(pixels[x, ny][3] > 180 for ny in range(y + 1, min(height, y + 7)))
                if (has_left and has_right) or (has_up and has_down):
                    selected.add((x, y))
        return selected

    selected = collect()
    before = len(selected)
    if not selected:
        return rgba, 0, 0

    for _ in range(8):
        changed = 0
        for x, y in sorted(selected, key=lambda point: point[1]):
            replacement = None
            for radius in range(1, 18):
                for ny in range(max(0, y - radius), min(height, y + radius + 1)):
                    for nx in range(max(0, x - radius), min(width, x + radius + 1)):
                        if (nx, ny) in selected:
                            continue
                        candidate = pixels[nx, ny]
                        if candidate[3] > 180 and not is_red_contam(candidate) and not is_dark_edge_matte(candidate):
                            replacement = candidate
                            break
                    if replacement is not None:
                        break
                if replacement is not None:
                    pixels[x, y] = replacement
                    changed += 1
                    break
        if changed == 0:
            break
        selected = collect()
        if not selected:
            break

    return rgba, before, len(collect())


def polish_lettermark(foreground: Image.Image) -> Image.Image:
    """Apply flat solid gold to the extracted lettermark mask."""
    rgba = foreground.convert("RGBA")
    width, height = rgba.size
    pixels = rgba.load()

    gold = (218, 175, 62, 255)

    for y in range(height):
        for x in range(width):
            _, _, _, a = pixels[x, y]
            if a == 0:
                continue
            pixels[x, y] = (gold[0], gold[1], gold[2], a)

    return rgba


def luminance(pixel: tuple[int, int, int, int]) -> float:
    r, g, b, _ = pixel
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def median_color(pixels: list[tuple[int, int, int, int]]) -> tuple[int, int, int, int]:
    return sorted(pixels, key=luminance)[len(pixels) // 2]


def collect_lettermark_surface_outliers(foreground: Image.Image) -> set[tuple[int, int]]:
    rgba = foreground.convert("RGBA")
    width, height = rgba.size
    pixels = rgba.load()
    selected: set[tuple[int, int]] = set()

    for y in range(5, height - 5):
        for x in range(5, width - 5):
            pixel = pixels[x, y]
            if pixel[3] < 220:
                continue

            samples: list[tuple[int, int, int, int]] = []
            is_interior = True
            for ny in range(y - 3, y + 4):
                for nx in range(x - 3, x + 4):
                    candidate = pixels[nx, ny]
                    if candidate[3] < 180:
                        is_interior = False
                        break
                    if candidate[3] > 220 and (nx != x or ny != y):
                        samples.append(candidate)
                if not is_interior:
                    break
            if not is_interior or len(samples) < 35:
                continue

            median = median_color(samples)
            color_distance = sum(abs(pixel[index] - median[index]) for index in range(3))
            if color_distance > 145 and abs(luminance(pixel) - luminance(median)) > 48:
                selected.add((x, y))

    return selected


def outlier_largest_cluster(points: set[tuple[int, int]]) -> int:
    seen: set[tuple[int, int]] = set()
    largest = 0
    for point in points:
        if point in seen:
            continue
        stack = [point]
        seen.add(point)
        count = 0
        while stack:
            x, y = stack.pop()
            count += 1
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                neighbor = (x + dx, y + dy)
                if neighbor in points and neighbor not in seen:
                    seen.add(neighbor)
                    stack.append(neighbor)
        largest = max(largest, count)
    return largest


def outlier_bounds(points: set[tuple[int, int]]) -> str:
    if not points:
        return "none"
    xs = [point[0] for point in points]
    ys = [point[1] for point in points]
    return f"({min(xs)},{min(ys)})-({max(xs)},{max(ys)})"


def repair_lettermark_surface_outliers(foreground: Image.Image) -> tuple[Image.Image, int, int, int, str]:
    rgba = foreground.convert("RGBA")
    width, height = rgba.size
    pixels = rgba.load()
    before = collect_lettermark_surface_outliers(rgba)
    if not before:
        return rgba, 0, 0, 0, "none"
    before_largest = outlier_largest_cluster(before)
    if len(before) <= SURFACE_OUTLIER_COUNT_LIMIT and before_largest <= SURFACE_OUTLIER_CLUSTER_LIMIT:
        return rgba, len(before), len(before), before_largest, outlier_bounds(before)

    for _ in range(8):
        selected = collect_lettermark_surface_outliers(rgba)
        if not selected:
            break
        selected_largest = outlier_largest_cluster(selected)
        if len(selected) <= SURFACE_OUTLIER_COUNT_LIMIT and selected_largest <= SURFACE_OUTLIER_CLUSTER_LIMIT:
            break
        for x, y in sorted(selected, key=lambda point: point[1]):
            replacement = None
            for radius in range(4, 28):
                candidates: list[tuple[int, int, int, int]] = []
                for ny in range(max(0, y - radius), min(height, y + radius + 1)):
                    for nx in range(max(0, x - radius), min(width, x + radius + 1)):
                        if (nx, ny) in selected:
                            continue
                        candidate = pixels[nx, ny]
                        if candidate[3] > 220 and not is_red_contam(candidate) and not is_dark_edge_matte(candidate):
                            candidates.append(candidate)
                if candidates:
                    replacement = median_color(candidates)
                    break
            if replacement is not None:
                pixels[x, y] = replacement

    after = collect_lettermark_surface_outliers(rgba)
    return rgba, len(before), len(after), outlier_largest_cluster(after), outlier_bounds(after)


def blend_color(
    first: tuple[int, int, int, int],
    second: tuple[int, int, int, int],
    amount: float,
) -> tuple[int, int, int, int]:
    amount = max(0.0, min(1.0, amount))
    return tuple(round(first[index] * (1 - amount) + second[index] * amount) for index in range(4))


def dimensional_fill(size: int) -> Image.Image:
    fill = Image.new("RGBA", (size, size), BRAND_RED)
    pixels = fill.load()
    # Light source: upper-left center, creating a convex pillow effect
    glow_x = size * 0.38
    glow_y = size * 0.36
    max_distance = ((size - glow_x) ** 2 + (size - glow_y) ** 2) ** 0.5

    for y in range(size):
        vertical = y / max(size - 1, 1)
        for x in range(size):
            horizontal = x / max(size - 1, 1)
            distance = (((x - glow_x) ** 2 + (y - glow_y) ** 2) ** 0.5) / max_distance
            # Strong upper-left sheen for premium highlight
            top_left_sheen = max(0.0, 1.0 - (horizontal * 0.9 + vertical * 1.1)) * 0.38
            # Pronounced center glow — the "convex surface" look
            center_glow = max(0.0, 1.0 - distance * 1.05) ** 2.2 * 0.72
            # Aggressive edge/corner darkening for vignette depth
            bottom_right_depth = (horizontal * 0.22) + (vertical * 0.28)
            edge_vignette = max(0.0, distance - 0.42) ** 1.4 * 0.82
            edge = edge_vignette + bottom_right_depth
            color = blend_color(BRAND_RED, BRAND_RED_LIGHT, center_glow + top_left_sheen)
            color = blend_color(color, BRAND_RED_DEEP, edge)
            pixels[x, y] = color

    # Soft highlight glow overlay (upper-center)
    glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    glow_draw.ellipse(
        (size * 0.12, size * 0.08, size * 0.72, size * 0.58),
        fill=(210, 38, 58, 62),
    )
    glow_draw.ellipse(
        (size * 0.25, size * 0.15, size * 0.65, size * 0.52),
        fill=(220, 55, 70, 38),
    )
    glow = glow.filter(ImageFilter.GaussianBlur(radius=max(24, size // 10)))
    fill.alpha_composite(glow)

    return fill


def rounded_tile(size: int, inset: int = 0, dimensional: bool = False) -> Image.Image:
    tile = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    mask = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(mask)
    radius = round((size - inset * 2) * 0.149)
    draw.rounded_rectangle((inset, inset, size - 1 - inset, size - 1 - inset), radius=radius, fill=255)
    fill = dimensional_fill(size) if dimensional else Image.new("RGBA", (size, size), BRAND_RED)
    tile.paste(fill, (0, 0, size, size), mask)
    if dimensional:
        accent = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        accent_draw = ImageDraw.Draw(accent)
        # Outer dark edge — creates the inset/shadow frame
        accent_draw.rounded_rectangle(
            (inset, inset, size - 1 - inset, size - 1 - inset),
            radius=radius,
            outline=(20, 0, 4, 48),
            width=max(2, size // 180),
        )
        # Inner subtle highlight rim
        accent_draw.rounded_rectangle(
            (inset + 8, inset + 8, size - 9 - inset, size - 9 - inset),
            radius=max(0, radius - 8),
            outline=(255, 255, 255, 14),
            width=max(1, size // 340),
        )
        accent = accent.filter(ImageFilter.GaussianBlur(radius=max(1, size / 900)))
        accent.putalpha(Image.composite(accent.getchannel("A"), Image.new("L", (size, size), 0), mask))
        tile.alpha_composite(accent)
    tile.putalpha(mask)
    return tile


def compose_rich_favicon(foreground: Image.Image) -> tuple[Image.Image, Image.Image, int, int, int, str]:
    size = 1024
    master = rounded_tile(size, dimensional=True)
    target_height = 792
    scale = target_height / foreground.height
    target_width = round(foreground.width * scale)
    target_x = round((size - target_width) / 2)
    target_y = 92
    resized = foreground.resize((target_width, target_height), Image.Resampling.LANCZOS)
    resized, surface_before, surface_after, surface_largest, surface_bounds = repair_lettermark_surface_outliers(resized)
    master.alpha_composite(resized, (target_x, target_y))
    return master, resized, surface_before, surface_after, surface_largest, surface_bounds


def compose_padded_logo(clean_canvas: Image.Image) -> Image.Image:
    logo = rounded_tile(1024, inset=56, dimensional=True)
    logo.alpha_composite(clean_canvas)
    return logo


def compose_flat_favicon_source(foreground: Image.Image) -> Image.Image:
    size = 1024
    master = rounded_tile(size, dimensional=True)
    target_height = 792
    scale = target_height / foreground.height
    target_width = round(foreground.width * scale)
    target_x = round((size - target_width) / 2)
    target_y = 92
    alpha = foreground.getchannel("A").resize((target_width, target_height), Image.Resampling.LANCZOS)
    flat_mark = Image.new("RGBA", (target_width, target_height), FAVICON_GOLD)
    flat_mark.putalpha(alpha)
    master.alpha_composite(flat_mark, (target_x, target_y))
    return master


def count_red_pixels(image: Image.Image, alpha_threshold: int = 0) -> int:
    return sum(
        1
        for pixel in image.convert("RGBA").get_flattened_data()
        if pixel[3] > alpha_threshold and is_bright_red_contam(pixel)
    )


def count_flat_foreground_pixels(image: Image.Image) -> int:
    return sum(
        1
        for r, g, b, a in image.convert("RGBA").get_flattened_data()
        if a > 120 and r > 180 and g > 135 and b < 140
    )


def save_image(image: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path)
    print(f"wrote {path} size={image.width}x{image.height}")


def save_resized(image: Image.Image, path: Path, size: int) -> None:
    save_image(image.resize((size, size), Image.Resampling.LANCZOS), path)


def validate_surface_target(name: str, foreground: Image.Image) -> tuple[int, int, str]:
    outliers = collect_lettermark_surface_outliers(foreground)
    largest = outlier_largest_cluster(outliers)
    bounds = outlier_bounds(outliers)
    print(f"surfaceTarget={name} outliers={len(outliers)} largestCluster={largest} bbox={bounds}")
    if len(outliers) > SURFACE_OUTLIER_COUNT_LIMIT or largest > SURFACE_OUTLIER_CLUSTER_LIMIT:
        raise SystemExit(f"Lettermark surface consistency check failed for {name}")
    return len(outliers), largest, bounds


def main() -> None:
    source = extract_reference_foreground(Image.open(REFERENCE_SOURCE))
    bounds = visible_bounds(source)
    foreground = source.crop(bounds)
    clean_foreground, red_before, red_after = nearest_non_red_fill(foreground)
    clean_foreground, edge_matte_before, edge_matte_after = repair_outer_edge_matte(clean_foreground)
    clean_foreground, alpha_scratch_before, alpha_scratch_after = repair_alpha_scratches(clean_foreground)
    clean_foreground, surface_before, surface_after, surface_largest, surface_bounds = repair_lettermark_surface_outliers(clean_foreground)
    clean_foreground = polish_lettermark(clean_foreground)
    clean_foreground = clear_transparent_rgb(clean_foreground)

    clean_canvas = Image.new("RGBA", source.size, (0, 0, 0, 0))
    clean_canvas.alpha_composite(clean_foreground, (bounds[0], bounds[1]))

    # Adaptive icon: scale down to fit Android's 66% safe zone
    adaptive_canvas = Image.new("RGBA", (CANVAS_SIZE, CANVAS_SIZE), (0, 0, 0, 0))
    adaptive_scale = 0.72  # ~37% of canvas, fits within safe zone
    adaptive_w = round(clean_foreground.width * adaptive_scale)
    adaptive_h = round(clean_foreground.height * adaptive_scale)
    adaptive_foreground = clean_foreground.resize((adaptive_w, adaptive_h), Image.Resampling.LANCZOS)
    adaptive_x = (CANVAS_SIZE - adaptive_w) // 2
    adaptive_y = (CANVAS_SIZE - adaptive_h) // 2
    adaptive_canvas.alpha_composite(adaptive_foreground, (adaptive_x, adaptive_y))

    rich_favicon, resized_foreground, rich_surface_before, rich_surface_after, rich_surface_largest, rich_surface_bounds = compose_rich_favicon(clean_foreground)
    padded_logo = compose_padded_logo(clean_canvas)
    flat_favicon_1024 = compose_flat_favicon_source(clean_foreground)

    direct_outputs = [
        (ZESHA / "assets" / "adaptive-icon.png", adaptive_canvas),
        (ZESHA / "assets" / "icon.png", padded_logo),
        (ZESHA / "assets" / "splash-icon.png", clean_canvas),
        (ZESHA / "public" / "logo-mark.png", padded_logo),
        (TELEBA / "public" / "logo-mark.png", padded_logo),
        (TELEBA / "app" / "apple-icon.png", rich_favicon.resize((180, 180), Image.Resampling.LANCZOS)),
        (TELEBA / "public" / "apple-icon.png", rich_favicon.resize((180, 180), Image.Resampling.LANCZOS)),
    ]
    flat_outputs = [
        (ZESHA / "assets" / "favicon.png", 256),
        (ZESHA / "public" / "favicon.png", 256),
        (ZESHA / "public" / "icon.png", 512),
        (TELEBA / "public" / "icon.png", 512),
        (TELEBA / "app" / "icon.png", 1024),
    ]

    for path, image in direct_outputs:
        save_image(image, path)
    for path, size in flat_outputs:
        save_resized(flat_favicon_1024, path, size)

    source_red_count = sum(1 for pixel in clean_canvas.get_flattened_data() if is_red_contam(pixel))
    resized_red_count = count_red_pixels(resized_foreground, alpha_threshold=32)
    flat_16 = flat_favicon_1024.resize((16, 16), Image.Resampling.LANCZOS)
    flat_32 = flat_favicon_1024.resize((32, 32), Image.Resampling.LANCZOS)
    flat_16_foreground = count_flat_foreground_pixels(flat_16)
    flat_32_foreground = count_flat_foreground_pixels(flat_32)
    apple_180_foreground = resized_foreground.resize(
        (round(resized_foreground.width * 180 / 1024), round(resized_foreground.height * 180 / 1024)),
        Image.Resampling.LANCZOS,
    )

    print(f"sourceBounds=({bounds[0]},{bounds[1]})-({bounds[2] - 1},{bounds[3] - 1})")
    print(f"foregroundRedBefore={red_before} foregroundRedAfter={red_after}")
    print(f"edgeDarkMatteBefore={edge_matte_before} edgeDarkMatteAfter={edge_matte_after}")
    print(f"alphaScratchBefore={alpha_scratch_before} alphaScratchAfter={alpha_scratch_after}")
    print(
        "lettermarkSurfaceOutliersBefore="
        f"{surface_before} lettermarkSurfaceOutliersAfter={surface_after} "
        f"largestCluster={surface_largest} bbox={surface_bounds}"
    )
    print(
        "richLettermarkSurfaceOutliersBefore="
        f"{rich_surface_before} richLettermarkSurfaceOutliersAfter={rich_surface_after} "
        f"largestCluster={rich_surface_largest} bbox={rich_surface_bounds}"
    )
    validate_surface_target("assets/adaptive-icon.png", clean_foreground)
    validate_surface_target("assets/splash-icon.png", clean_foreground)
    validate_surface_target("assets/icon.png", clean_foreground)
    validate_surface_target("public/logo-mark.png", clean_foreground)
    validate_surface_target("teleba/public/logo-mark.png", clean_foreground)
    validate_surface_target("teleba/app/apple-icon.png", apple_180_foreground)
    validate_surface_target("teleba/public/apple-icon.png", apple_180_foreground)
    print(f"adaptiveSourceContamination={source_red_count}")
    print(f"resizedForegroundRed={resized_red_count}")
    print(f"flat16ForegroundPixels={flat_16_foreground}")
    print(f"flat32ForegroundPixels={flat_32_foreground}")

    if red_after > 0 or edge_matte_after > 0 or alpha_scratch_after > 0 or source_red_count > 0 or resized_red_count > 0:
        raise SystemExit("Contamination check failed after generation")
    if surface_after > SURFACE_OUTLIER_COUNT_LIMIT or surface_largest > SURFACE_OUTLIER_CLUSTER_LIMIT:
        raise SystemExit("Lettermark surface consistency check failed after generation")
    if rich_surface_after > SURFACE_OUTLIER_COUNT_LIMIT or rich_surface_largest > SURFACE_OUTLIER_CLUSTER_LIMIT:
        raise SystemExit("Rich lettermark surface consistency check failed after generation")
    if flat_16_foreground < 24 or flat_32_foreground < 120:
        raise SystemExit("Flat favicon foreground is too small at browser-tab sizes")


if __name__ == "__main__":
    main()