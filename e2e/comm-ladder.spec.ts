import { test, expect } from './fixtures/fixtures'

test.describe('Comm Ladder and Radio Default Functionality', () => {
  test.beforeEach(async ({ missionListPage, missionEditorPage }) => {
    // Create a new F-16C mission
    await missionListPage.createMissionSimple()

    // Navigate to Radios tab and switch to first radio (UHF)
    await missionEditorPage.radio.navigateToTab()
    await missionEditorPage.radio.switchToRadioTab('COMM 1 (UHF) AN/ARC-164')
  })

  test('should type freeform text into comm ladder field', async ({ missionEditorPage }) => {
    const { radio } = missionEditorPage
    const input = await radio.getCommLadderInput()

    await input.fill('1-2-3-4-12')

    await expect(input).toHaveValue('1-2-3-4-12')
  })

  test('should select default mode as Preset and choose preset number', async ({
    missionEditorPage,
  }) => {
    const { radio } = missionEditorPage
    const modeSelector = await radio.getDefaultModeSelector()

    // Default should be Preset mode
    await expect(modeSelector).toContainText('Preset')

    // The preset selector should be visible
    const presetSelector = radio.getPresetSelector()
    await expect(presetSelector).toBeVisible()

    // Select preset 5
    await radio.selectPreset('5')

    // Verify preset 5 is selected
    await expect(presetSelector).toContainText('5')
  })

  test('should switch to Manual mode and enter frequency', async ({ missionEditorPage }) => {
    const { radio } = missionEditorPage
    const modeSelector = await radio.getDefaultModeSelector()

    // Switch to Manual mode
    await radio.selectDefaultMode('Manual')

    // Verify Manual mode is selected
    await expect(modeSelector).toContainText('Manual')

    // The frequency input should now be visible
    const frequencyInput = radio.getFrequencyInput()
    await expect(frequencyInput).toBeVisible()

    // Enter a frequency
    await radio.fillFrequency('251.5')

    // Verify the frequency was entered
    await expect(frequencyInput).toHaveValue('251.5')
  })

  test('should switch between different radio tabs and preserve settings', async ({
    missionEditorPage,
  }) => {
    const { radio } = missionEditorPage

    // Test UHF radio (COM 1)
    await radio.switchToRadioTab('COMM 1 (UHF) AN/ARC-164')

    // Enter comm ladder text for UHF
    await radio.fillCommLadder('1-2-3')

    // Switch to VHF radio (COM 2)
    await radio.switchToRadioTab('COMM 2 (VHF) AN/ARC-222')

    // VHF comm ladder should be empty
    const vhfCommLadder = await radio.getCommLadderInput()
    await expect(vhfCommLadder).toHaveValue('')

    // Enter comm ladder text for VHF
    await radio.fillCommLadder('4-5-6')

    // Switch back to UHF - should still have the original text
    await radio.switchToRadioTab('COMM 1 (UHF) AN/ARC-164')
    const uhfCommLadderAgain = await radio.getCommLadderInput()
    await expect(uhfCommLadderAgain).toHaveValue('1-2-3')

    // Switch back to VHF - should still have its text
    await radio.switchToRadioTab('COMM 2 (VHF) AN/ARC-222')
    const vhfCommLadderAgain = await radio.getCommLadderInput()
    await expect(vhfCommLadderAgain).toHaveValue('4-5-6')
  })

  test('should preserve radio default settings across tab switches', async ({
    missionEditorPage,
  }) => {
    const { radio } = missionEditorPage

    // Set UHF to Manual mode with frequency
    await radio.switchToRadioTab('COMM 1 (UHF) AN/ARC-164')
    await radio.selectDefaultMode('Manual')
    await radio.fillFrequency('305.0')

    // Switch to VHF and set a different preset
    await radio.switchToRadioTab('COMM 2 (VHF) AN/ARC-222')
    await radio.selectPreset('10')

    // Switch back to UHF - should still be Manual mode with frequency
    await radio.switchToRadioTab('COMM 1 (UHF) AN/ARC-164')
    const uhfModeSelectorAgain = await radio.getDefaultModeSelector()
    await expect(uhfModeSelectorAgain).toContainText('Manual')
    const uhfFrequencyInputAgain = radio.getFrequencyInput()
    await expect(uhfFrequencyInputAgain).toHaveValue('305.000')

    // Switch back to VHF - should still have preset 10
    await radio.switchToRadioTab('COMM 2 (VHF) AN/ARC-222')
    const vhfPresetSelectorAgain = radio.getPresetSelector()
    await expect(vhfPresetSelectorAgain).toContainText('10')
  })
})
