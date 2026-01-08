#!/bin/bash
# Generate app icons for all platforms from a source PNG (1024x1024)
# Usage: ./scripts/generate-icons.sh [source.png]

SOURCE="${1:-build/icon-source.png}"
BUILD_DIR="build"

if [ ! -f "$SOURCE" ]; then
    echo "Source image not found: $SOURCE"
    echo "Please provide a 1024x1024 PNG image"
    exit 1
fi

echo "Generating icons from $SOURCE..."

# Create iconset directory for macOS
ICONSET="$BUILD_DIR/icon.iconset"
mkdir -p "$ICONSET"

# Generate different sizes for macOS iconset
sips -z 16 16     "$SOURCE" --out "$ICONSET/icon_16x16.png"
sips -z 32 32     "$SOURCE" --out "$ICONSET/icon_16x16@2x.png"
sips -z 32 32     "$SOURCE" --out "$ICONSET/icon_32x32.png"
sips -z 64 64     "$SOURCE" --out "$ICONSET/icon_32x32@2x.png"
sips -z 128 128   "$SOURCE" --out "$ICONSET/icon_128x128.png"
sips -z 256 256   "$SOURCE" --out "$ICONSET/icon_128x128@2x.png"
sips -z 256 256   "$SOURCE" --out "$ICONSET/icon_256x256.png"
sips -z 512 512   "$SOURCE" --out "$ICONSET/icon_256x256@2x.png"
sips -z 512 512   "$SOURCE" --out "$ICONSET/icon_512x512.png"
sips -z 1024 1024 "$SOURCE" --out "$ICONSET/icon_512x512@2x.png"

# Convert to icns
iconutil -c icns "$ICONSET" -o "$BUILD_DIR/icon.icns"
echo "Created: $BUILD_DIR/icon.icns"

# Copy main icon for Linux
cp "$SOURCE" "$BUILD_DIR/icon.png"
echo "Created: $BUILD_DIR/icon.png"

# Create icons directory for Linux (multiple sizes)
mkdir -p "$BUILD_DIR/icons"
sips -z 16 16     "$SOURCE" --out "$BUILD_DIR/icons/16x16.png"
sips -z 32 32     "$SOURCE" --out "$BUILD_DIR/icons/32x32.png"
sips -z 48 48     "$SOURCE" --out "$BUILD_DIR/icons/48x48.png"
sips -z 64 64     "$SOURCE" --out "$BUILD_DIR/icons/64x64.png"
sips -z 128 128   "$SOURCE" --out "$BUILD_DIR/icons/128x128.png"
sips -z 256 256   "$SOURCE" --out "$BUILD_DIR/icons/256x256.png"
sips -z 512 512   "$SOURCE" --out "$BUILD_DIR/icons/512x512.png"
echo "Created Linux icons in: $BUILD_DIR/icons/"

# For Windows ICO, you'll need ImageMagick or an online converter
# If ImageMagick is installed:
if command -v convert &> /dev/null; then
    convert "$SOURCE" -define icon:auto-resize=256,128,64,48,32,16 "$BUILD_DIR/icon.ico"
    echo "Created: $BUILD_DIR/icon.ico"
else
    echo "Note: ImageMagick not found. Create Windows .ico file manually using:"
    echo "  brew install imagemagick"
    echo "  convert $SOURCE -define icon:auto-resize=256,128,64,48,32,16 $BUILD_DIR/icon.ico"
fi

# Cleanup
rm -rf "$ICONSET"

echo "Done! Icons generated in $BUILD_DIR/"
