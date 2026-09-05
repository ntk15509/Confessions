import { EMOJIS } from "../constants";

export default function EmojiPicker({ onSelect }) {
  return <div className="emoji_picker">{EMOJIS.map((emoji) => <button type="button" className="emoji_item" data-emoji={emoji} key={emoji} onClick={() => onSelect(emoji)}>{emoji}</button>)}</div>;
}
