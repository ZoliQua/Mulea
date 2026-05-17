type Replay = 'none' | 'ok' | 'differs' | 'invalid';

export function CapsuleBar(props: {
  onShare: () => void;
  shareDisabled: boolean;
  shareUrl: string | null;
  replay: Replay;
}) {
  return (
    <div className="capsule-bar">
      <button type="button" onClick={props.onShare} disabled={props.shareDisabled}>🔗 Share link</button>
      {props.shareDisabled && <span className="muted">inputs too large for a shareable link</span>}
      {props.shareUrl && (
        <input className="share-url" readOnly value={props.shareUrl} onFocus={(e) => e.currentTarget.select()} />
      )}
      {props.replay === 'ok' && <span className="ok">✓ Reproduced exactly (matches the shared fingerprint)</span>}
      {props.replay === 'differs' && <span className="warn">⚠ Result differs from the shared capsule (ontology or engine changed)</span>}
      {props.replay === 'invalid' && <span className="error">This shared link is invalid.</span>}
    </div>
  );
}
