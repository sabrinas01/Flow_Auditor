import React, { useState, useEffect, useCallback } from 'react';
import debounce from '../utils/debounce';

// NOTE (UX / Dev): Debounce delay must be 1.2 seconds (1200 ms).
// This is documented here in-code so future devs see the requirement
// and don't change the default value inadvertently.
const DEBOUNCE_MS = 1200; // 1.2s — documentado explícitamente

export default function SearchBar({ onSearch }) {
  const [q, setQ] = useState('');

  // We create a stable debounced handler. Uses default 1.2s in util if omitted.
  const debouncedSearch = useCallback(
    debounce((term) => {
      // perform the search callback supplied by parent
      onSearch && onSearch(term);
    }, DEBOUNCE_MS),
    [onSearch]
  );

  useEffect(() => {
    // Cleanup: cancel pending debounced call on unmount
    return () => {
      if (debouncedSearch && debouncedSearch.cancel) debouncedSearch.cancel();
    };
  }, [debouncedSearch]);

  function handleChange(e) {
    const value = e.target.value;
    setQ(value);
    // defer heavy work to debounced handler
    debouncedSearch(value);
  }

  return (
    <input
      type="search"
      placeholder="Buscar..."
      value={q}
      onChange={handleChange}
      aria-label="Buscar"
    />
  );
}