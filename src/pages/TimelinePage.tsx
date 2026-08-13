import { useCallback, useRef, useState } from 'react';
import { TimelineService } from '../services/TimelineService';
import { parseHandlesFromJson } from '../services/ExportImport';
import { TimelinePanel } from '../components/TimelinePanel';
import { HandleChipList } from '../components/HandleChipList';
import { FeedPostCard } from '../components/FeedPostCard';
import { useLanguage } from '../i18n/LanguageContext';
import { formatNumber, localizeErrorMessage } from '../i18n/format';
import type { TimelinePost, TimelineProgress } from '../types';

type Status = 'idle' | 'loading' | 'done' | 'error';

export function TimelinePage({ onFocusAuthor }: { onFocusAuthor: (handle: string) => void }) {
  const { lang, dict } = useLanguage();
  const [handles, setHandles] = useState<string[]>([]);
  const [handleInput, setHandleInput] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [progress, setProgress] = useState<TimelineProgress | null>(null);
  const [posts, setPosts] = useState<TimelinePost[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const serviceRef = useRef(new TimelineService());

  const isLoading = status === 'loading';

  const addHandle = useCallback((raw: string) => {
    const cleaned = raw.trim().replace(/^@/, '');
    if (!cleaned) return;
    setHandles((prev) => (prev.includes(cleaned) ? prev : [...prev, cleaned]));
    setHandleInput('');
  }, []);

  const removeHandle = useCallback((handle: string) => {
    setHandles((prev) => prev.filter((h) => h !== handle));
  }, []);

  const onFileChosen = useCallback(
    async (file: File) => {
      setFileError(null);
      try {
        const text = await file.text();
        const found = parseHandlesFromJson(text);
        setHandles((prev) => Array.from(new Set([...prev, ...found])));
      } catch (err) {
        const raw = err instanceof Error ? err.message : 'Could not read that file.';
        setFileError(localizeErrorMessage(raw, lang));
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    },
    [lang]
  );

  const runTimeline = useCallback(async () => {
    if (handles.length === 0) return;
    setStatus('loading');
    setErrorMessage(null);
    setPosts([]);

    try {
      const result = await serviceRef.current.buildTimeline(handles, (p) => {
        setProgress(p);
        if (p.posts) setPosts(p.posts);
      });
      setPosts(result);
      setStatus('done');
    } catch (err) {
      const raw = err instanceof Error ? err.message : dict.common.timelineErrorFallback;
      setErrorMessage(localizeErrorMessage(raw, lang));
      setStatus('error');
    }
  }, [handles, lang, dict]);

  return (
    <>
      <div className="eyebrow">{dict.timeline.eyebrow}</div>
      <h1>{dict.timeline.h1}</h1>
      <p className="subhead">{dict.timeline.subhead}</p>

      <div className="options-panel">
        <div className="options-title">{dict.timeline.addManually}</div>
        <div className="search-row" style={{ marginBottom: 0 }}>
          <div className="at-input-wrap" dir="ltr">
            <span className="at-symbol">@</span>
            <input
              type="text"
              placeholder={dict.timeline.handlePlaceholder}
              value={handleInput}
              onChange={(e) => setHandleInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isLoading) {
                  e.preventDefault();
                  addHandle(handleInput);
                }
              }}
              disabled={isLoading}
            />
          </div>
          <button
            type="button"
            className="primary"
            onClick={() => addHandle(handleInput)}
            disabled={isLoading || !handleInput.trim()}
          >
            {dict.timeline.add}
          </button>
        </div>
        <div className="options-hint">{dict.timeline.addHint}</div>

        <div className="upload-row">
          <button
            type="button"
            className="secondary"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
          >
            {dict.timeline.uploadList}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden-file-input"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onFileChosen(file);
            }}
          />
          <span className="options-hint" style={{ margin: 0 }}>
            {dict.timeline.uploadHint}
          </span>
        </div>
        {fileError && <div className="error-box">{fileError}</div>}

        <HandleChipList handles={handles} onRemove={removeHandle} disabled={isLoading} />
      </div>

      <div className="search-row">
        <button
          type="button"
          className="primary"
          onClick={runTimeline}
          disabled={isLoading || handles.length === 0}
        >
          {isLoading
            ? dict.timeline.loading
            : `${dict.timeline.load} (${formatNumber(handles.length, lang)})`}
        </button>
      </div>
      <div className="hint">{dict.common.noLogin}</div>

      {errorMessage && <div className="error-box">{errorMessage}</div>}

      {progress && (status === 'loading' || status === 'done') && <TimelinePanel progress={progress} />}

      {status === 'done' && (
        <>
          {posts.length === 0 ? (
            <div className="empty-state">{dict.timeline.emptyState}</div>
          ) : (
            <>
              <div className="options-hint">{dict.timeline.focusHint}</div>
              <div className="feed-list">
                {posts.map((post) => (
                  <FeedPostCard key={post.uri} post={post} onAuthorClick={onFocusAuthor} />
                ))}
              </div>
            </>
          )}
        </>
      )}

      <div className="footnote">{dict.timeline.footnote}</div>
    </>
  );
}
