import type { Player } from './types';

export function isHostOrCohost(player: Player): boolean {
  return player.role === 'host' || player.role === 'cohost';
}

export function isHost(player: Player): boolean {
  return player.role === 'host';
}
