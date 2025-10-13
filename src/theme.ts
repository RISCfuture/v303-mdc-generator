import type { GlobalThemeOverrides } from 'naive-ui'

// v303rd Fighter Group color palette
// Navy blue from emblem: #0a0a5a
// Gold/Yellow from emblem: #ffc107

const v303Navy = '#0a0a5a'
const v303Gold = '#ffc107'
const v303LightGold = '#ffd54f'

export const lightThemeOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: v303Navy,
    primaryColorHover: '#0d0d75',
    primaryColorPressed: '#070745',
    primaryColorSuppl: v303Gold,
  },
  InputNumber: {
    peers: {
      Input: {},
    },
    peerOverrides: {
      Input: {},
    },
  },
}

export const darkThemeOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: v303Gold,
    primaryColorHover: v303LightGold,
    primaryColorPressed: '#ffb300',
    primaryColorSuppl: v303Navy,
  },
  InputNumber: {
    peers: {
      Input: {},
    },
    peerOverrides: {
      Input: {},
    },
  },
}
