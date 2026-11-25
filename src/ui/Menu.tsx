import { useEffect, useRef } from 'react';
import type { Level } from '../engine/ai';
import type { Mode } from './announce';
import type { Settings, Start } from './storage';

interface MenuProps {
  readonly settings: Settings;
  readonly canContinue: boolean;
  readonly onChange: (settings: Settings) => void;
  readonly onNewGame: () => void;
  readonly onContinue: () => void;
  readonly onHelp: () => void;
}

interface Choice<T> {
  readonly value: T;
  readonly label: string;
}

const MODES: Choice<Mode>[] = [
  { value: 'ai', label: 'Against the AI' },
  { value: 'two', label: 'Two players on this device' },
];
const LEVELS: Choice<Level>[] = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
];
const STARTS: Choice<Start>[] = [
  { value: 'you', label: 'You' },
  { value: 'ai', label: 'The AI' },
  { value: 'random', label: 'Random' },
];

function Radios<T extends string>(props: {
  legend: string;
  name: string;
  choices: Choice<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset>
      <legend>{props.legend}</legend>
      {props.choices.map(c => (
        <label key={c.value}>
          <input
            type="radio"
            name={props.name}
            value={c.value}
            checked={props.value === c.value}
            onChange={() => props.onChange(c.value)}
          />
          {c.label}
        </label>
      ))}
    </fieldset>
  );
}

export function Menu({ settings, canContinue, onChange, onNewGame, onContinue, onHelp }: MenuProps) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);

  return (
    <section className="menu" aria-labelledby="menu-heading">
      <h1 id="menu-heading" ref={heading} tabIndex={-1}>
        Chaos Cube
      </h1>
      <p>Tic-tac-toe on a Rubik&apos;s cube. Get 5 in a row, and watch out for hidden chaos cells.</p>
      <Radios legend="Players" name="mode" choices={MODES} value={settings.mode} onChange={mode => onChange({ ...settings, mode })} />
      {settings.mode === 'ai' && (
        <>
          <Radios legend="AI level" name="level" choices={LEVELS} value={settings.level} onChange={level => onChange({ ...settings, level })} />
          <Radios legend="Who goes first" name="start" choices={STARTS} value={settings.start} onChange={start => onChange({ ...settings, start })} />
        </>
      )}
      <div className="actions">
        <button type="button" onClick={onNewGame}>
          New game
        </button>
        {canContinue && (
          <button type="button" onClick={onContinue}>
            Continue game
          </button>
        )}
        <button type="button" onClick={onHelp}>
          How to play
        </button>
      </div>
    </section>
  );
}
