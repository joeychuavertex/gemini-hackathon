/**
 * Genre selector component for choosing commentary style
 */
import { Genre, GENRE_INFO } from "../types/index";
import "../styles/GenreSelector.css";

interface GenreSelectorProps {
  selectedGenre: Genre | null;
  onSelectGenre: (genre: Genre) => void;
  disabled?: boolean;
}

export function GenreSelector({
  selectedGenre,
  onSelectGenre,
  disabled = false,
}: GenreSelectorProps) {
  const genres = Object.values(GENRE_INFO);

  return (
    <div className="genre-selector">
      <h2 className="genre-title">Choose Your Commentary Style</h2>
      <div className="genre-grid">
        {genres.map((genre) => (
          <button
            key={genre.id}
            onClick={() => onSelectGenre(genre.id)}
            disabled={disabled}
            className={`genre-card ${
              selectedGenre === genre.id ? "selected" : ""
            } ${disabled ? "disabled" : ""}`}
          >
            <span className="genre-icon">{genre.icon}</span>
            <span className="genre-name">{genre.name}</span>
            <span className="genre-description">{genre.description}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
