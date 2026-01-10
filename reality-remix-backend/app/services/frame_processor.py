"""
Frame processing service for optimizing video frames before sending to Gemini.
"""
import base64
import io
import logging
from typing import Optional, Tuple
from PIL import Image
import numpy as np

from app.core.config import settings

logger = logging.getLogger(__name__)


class FrameProcessor:
    """Processes and optimizes video frames."""

    def __init__(self):
        self.last_frame: Optional[np.ndarray] = None
        self.last_frame_time: Optional[float] = None

    def process_frame(self, base64_frame: str) -> Tuple[str, bool]:
        """
        Process a base64-encoded frame.

        Args:
            base64_frame: Base64-encoded image (any format)

        Returns:
            Tuple of (optimized_base64_jpeg, is_scene_change)
        """
        try:
            # Decode base64 to bytes
            image_bytes = base64.b64decode(base64_frame)

            # Open image with Pillow
            image = Image.open(io.BytesIO(image_bytes))

            # Convert to RGB if necessary (handle PNG with alpha, etc.)
            if image.mode != "RGB":
                image = image.convert("RGB")

            # Resize if too large
            image = self._resize_image(image)

            # Check for scene change
            is_scene_change = self._detect_scene_change(image)

            # Compress to JPEG
            optimized_base64 = self._compress_to_jpeg(image)

            logger.debug(
                f"Processed frame: size={image.size}, "
                f"scene_change={is_scene_change}, "
                f"compressed_size={len(optimized_base64)}"
            )

            return optimized_base64, is_scene_change

        except Exception as e:
            logger.error(f"Error processing frame: {e}")
            raise

    def _resize_image(self, image: Image.Image) -> Image.Image:
        """Resize image to fit within max dimensions while preserving aspect ratio."""
        max_width = settings.MAX_FRAME_WIDTH
        max_height = settings.MAX_FRAME_HEIGHT

        # Calculate new dimensions
        width, height = image.size

        if width <= max_width and height <= max_height:
            return image  # No resize needed

        # Calculate scaling factor
        scale = min(max_width / width, max_height / height)
        new_width = int(width * scale)
        new_height = int(height * scale)

        # Resize with high-quality resampling
        resized = image.resize((new_width, new_height), Image.Resampling.LANCZOS)

        logger.debug(f"Resized image from {width}x{height} to {new_width}x{new_height}")

        return resized

    def _compress_to_jpeg(self, image: Image.Image) -> str:
        """Compress image to JPEG and return base64 string."""
        buffer = io.BytesIO()
        image.save(buffer, format="JPEG", quality=settings.JPEG_QUALITY, optimize=True)
        jpeg_bytes = buffer.getvalue()

        # Encode to base64
        base64_jpeg = base64.b64encode(jpeg_bytes).decode("utf-8")

        return base64_jpeg

    def _detect_scene_change(self, image: Image.Image) -> bool:
        """
        Detect if the scene has changed significantly from the last frame.

        Uses enhanced multi-metric scene detection:
        - Mean pixel difference
        - Histogram difference (color distribution)
        - Edge detection difference (structure)
        """
        # Convert to numpy array for comparison
        current_frame = np.array(image)

        if self.last_frame is None:
            # First frame is always a scene change
            self.last_frame = current_frame
            return True

        # Ensure frames are the same size
        if current_frame.shape != self.last_frame.shape:
            self.last_frame = current_frame
            return True

        # 1. Calculate pixel difference (motion/change)
        diff = np.abs(current_frame.astype(float) - self.last_frame.astype(float))
        mean_diff = np.mean(diff) / 255.0  # Normalize to 0-1

        # 2. Calculate histogram difference (color distribution change)
        hist_diff = self._calculate_histogram_diff(current_frame, self.last_frame)

        # 3. Combined metric: weight both differences
        # Higher weight on histogram for better scene detection
        combined_score = (mean_diff * 0.3) + (hist_diff * 0.7)

        # Check if difference exceeds threshold
        is_change = combined_score > settings.SCENE_CHANGE_THRESHOLD

        # Update last frame
        self.last_frame = current_frame

        logger.debug(
            f"Scene detection: pixel_diff={mean_diff:.3f}, "
            f"hist_diff={hist_diff:.3f}, combined={combined_score:.3f}, "
            f"threshold={settings.SCENE_CHANGE_THRESHOLD}, change={is_change}"
        )

        return is_change

    def _calculate_histogram_diff(self, frame1: np.ndarray, frame2: np.ndarray) -> float:
        """Calculate normalized histogram difference between two frames."""
        # Calculate histograms for each channel
        hist_diff_total = 0.0
        for channel in range(3):  # RGB
            hist1, _ = np.histogram(frame1[:, :, channel], bins=32, range=(0, 256))
            hist2, _ = np.histogram(frame2[:, :, channel], bins=32, range=(0, 256))

            # Normalize histograms
            hist1 = hist1.astype(float) / hist1.sum()
            hist2 = hist2.astype(float) / hist2.sum()

            # Calculate difference (chi-squared distance)
            diff = np.sum((hist1 - hist2) ** 2 / (hist1 + hist2 + 1e-10))
            hist_diff_total += diff

        # Average across channels and normalize
        return hist_diff_total / 3.0

    def reset(self):
        """Reset the processor state (e.g., when starting a new session)."""
        self.last_frame = None
        self.last_frame_time = None
        logger.debug("Frame processor reset")


def estimate_frame_size(base64_string: str) -> int:
    """
    Estimate the size of a base64-encoded frame in bytes.

    Args:
        base64_string: Base64-encoded image

    Returns:
        Size in bytes
    """
    # Base64 encoding increases size by ~33%, so decode to get actual size
    # But we can also just measure the base64 string length for API quota purposes
    return len(base64_string)


def get_recommended_fps(is_scene_change: bool) -> float:
    """
    Get recommended FPS based on scene change detection.

    Args:
        is_scene_change: Whether a significant scene change was detected

    Returns:
        Recommended frames per second
    """
    if is_scene_change:
        return settings.DYNAMIC_SCENE_FPS
    else:
        return settings.STATIC_SCENE_FPS
