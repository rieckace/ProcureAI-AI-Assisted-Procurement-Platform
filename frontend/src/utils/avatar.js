/**
 * DiceBear avatar URL generator.
 *
 * Uses cheerful, happy DiceBear styles — deterministic by user name.
 *
 * @param {string} name                - The user's name (seed for deterministic avatars)
 * @param {number} [size=40]           - Avatar size in pixels
 * @param {string} [style]             - DiceBear style name (defaults to localStorage or 'big-smile')
 * @param {string} [bg]                - Background color hexes (comma-separated, no #)
 * @returns {string} The DiceBear HTTP API URL
 */
export function getAvatarUrl(name, size = 40, style, bg) {
  const seed = encodeURIComponent(name || 'user');

  // Resolve style: arg > localStorage > default
  const resolvedStyle = style || localStorage.getItem('procura_avatar_style') || 'big-smile';

  // Resolve background: arg > localStorage > default palette
  const resolvedBg =
    bg ||
    localStorage.getItem('procura_avatar_bg') ||
    'b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf,fab7b7,e8d5b7,ffd6e0,f0d5e8,d5e8d5';

  return `https://api.dicebear.com/9.x/${resolvedStyle}/svg?seed=${seed}&backgroundColor=${resolvedBg}&scale=${Math.round(size * 1.8)}`;
}

/**
 * All available DiceBear styles with display metadata
 */
export const AVATAR_STYLES = [
  { id: 'big-smile',         name: 'Big Smile',        group: 'happy',    description: '😊 Cheerful faces with big toothy smiles!' },
  { id: 'adventurer',        name: 'Adventurer',       group: 'cartoon',  description: '🎨 Expressive cartoon characters' },
  { id: 'adventurer-neutral',name: 'Adventurer Neut.', group: 'cartoon',  description: '🎭 Neutral cartoon expressions' },
  { id: 'avataaars',         name: 'Avataaars',        group: 'clean',    description: '👤 Polished, professional avatars' },
  { id: 'avataaars-neutral', name: 'Avataaars Neut.',  group: 'clean',    description: '👔 Professional neutral style' },
  { id: 'big-ears',          name: 'Big Ears',         group: 'fun',      description: '👂 Fun big-eared characters' },
  { id: 'big-ears-neutral',  name: 'Big Ears Neut.',   group: 'fun',      description: '👂 Neutral big-eared style' },
  { id: 'bottts',            name: 'Bottts',           group: 'tech',     description: '🤖 Tech-forward robot avatars' },
  { id: 'bottts-neutral',    name: 'Bottts Neut.',     group: 'tech',     description: '⚙️ Neutral robot style' },
  { id: 'croodles',          name: 'Croodles',         group: 'fun',      description: '🎪 Doodle-style fun avatars' },
  { id: 'croodles-neutral',  name: 'Croodles Neut.',   group: 'fun',      description: '🎯 Neutral doodle style' },
  { id: 'identicon',         name: 'Identicon',        group: 'abstract', description: '🔷 Geometric identicon patterns' },
  { id: 'initials',          name: 'Initials',         group: 'abstract', description: '🔤 Clean letter-based avatars' },
  { id: 'micah',             name: 'Micah',            group: 'clean',    description: '🎪 3D illustrated characters' },
  { id: 'miniavs',           name: 'Miniavs',          group: 'cartoon',  description: '👶 Mini cartoon avatars' },
  { id: 'notionists',        name: 'Notionists',       group: 'clean',    description: '✨ Minimalist, clean style' },
  { id: 'notionists-neutral',name: 'Notionists Neut.',  group: 'clean',    description: '☁️ Neutral minimalist style' },
  { id: 'open-peeps',        name: 'Open Peeps',       group: 'cartoon',  description: '👥 Hand-drawn character set' },
  { id: 'personas',          name: 'Personas',         group: 'clean',    description: '🧑 Diverse character portraits' },
  { id: 'pixel-art',         name: 'Pixel Art',        group: 'fun',      description: '🟦 Retro pixel-art avatars' },
  { id: 'rings',             name: 'Rings',            group: 'abstract', description: '⭕ Geometric ring patterns' },
  { id: 'shapes',            name: 'Shapes',           group: 'abstract', description: '🔺 Abstract geometric shapes' },
  { id: 'thumbs',            name: 'Thumbs Up',        group: 'fun',      description: '👍 Fun thumbs-up themed!' },
];

/** Quick color presets for the background picker */
export const BG_COLORS = [
  { hex: 'b6e3f4', name: 'Sky Blue' },
  { hex: 'c0aede', name: 'Lavender' },
  { hex: 'd1d4f9', name: 'Periwinkle' },
  { hex: 'ffd5dc', name: 'Blush Pink' },
  { hex: 'ffdfbf', name: 'Peach' },
  { hex: 'fab7b7', name: 'Coral' },
  { hex: 'e8d5b7', name: 'Sand' },
  { hex: 'ffd6e0', name: 'Rose' },
  { hex: 'f0d5e8', name: 'Mauve' },
  { hex: 'd5e8d5', name: 'Sage' },
  { hex: 'b5e6d5', name: 'Mint' },
  { hex: 'ffebc2', name: 'Warm Yellow' },
  { hex: 'f9c9b6', name: 'Soft Salmon' },
  { hex: 'c1e1ec', name: 'Ice Blue' },
  { hex: 'd9d2e9', name: 'Soft Purple' },
];
