import { type Page } from '@playwright/test'
import { BasicInfoPanel } from '../components/BasicInfoPanel'
import { BriefingPanel } from '../components/BriefingPanel'
import { ExportControls } from '../components/ExportControls'
import { FlightMembersPanel } from '../components/FlightMembersPanel'
import { LoadoutPanel } from '../components/LoadoutPanel'
import { RadioPanel } from '../components/RadioPanel'
import { SteerpointsPanel } from '../components/SteerpointsPanel'
import { ToldFuelPanel } from '../components/ToldFuelPanel'

/**
 * Page object for the mission editor page.
 * Composes all tab-specific component objects and provides
 * convenience methods for common multi-tab workflows.
 */
export class MissionEditorPage {
  readonly page: Page
  readonly basicInfo: BasicInfoPanel
  readonly briefing: BriefingPanel
  readonly exportControls: ExportControls
  readonly flightMembers: FlightMembersPanel
  readonly loadout: LoadoutPanel
  readonly radio: RadioPanel
  readonly steerpoints: SteerpointsPanel
  readonly toldFuel: ToldFuelPanel

  constructor(page: Page) {
    this.page = page
    this.basicInfo = new BasicInfoPanel(page)
    this.briefing = new BriefingPanel(page)
    this.exportControls = new ExportControls(page)
    this.flightMembers = new FlightMembersPanel(page)
    this.loadout = new LoadoutPanel(page)
    this.radio = new RadioPanel(page)
    this.steerpoints = new SteerpointsPanel(page)
    this.toldFuel = new ToldFuelPanel(page)
  }

  /** Navigate to a specific tab by name */
  async navigateToTab(tabName: string) {
    await this.page.getByText(tabName, { exact: true }).click()
  }

  /**
   * Fill in all required fields to make a mission exportable.
   * Sets mission type, crew member, callsign, Link16 prefix,
   * departure/recovery airports and runways, remarks, and TOLD speeds.
   */
  async fillRequiredFields() {
    // Set mission type
    await this.basicInfo.setMissionType('CAS')

    // Add crew member with callsign and Link16 prefix
    await this.flightMembers.navigateToTab()
    await this.flightMembers.waitForVisible()
    await this.flightMembers.addFirstCrewMember()
    await this.flightMembers.setCallsign('VIPER')
    await this.flightMembers.setLink16Prefix('VR')

    // Set departure airport and runway
    await this.basicInfo.navigateToTab()
    await this.basicInfo.selectDepartureAirport('KA')
    await this.basicInfo.selectDepartureRunway()

    // Set recovery airport and runway
    await this.basicInfo.selectRecoveryAirport('KA')
    await this.basicInfo.selectRecoveryRunway()

    // Fill in remarks
    await this.briefing.navigateToTab()
    await this.briefing.fillRemarks('Test mission remarks')

    // Fill in TOLD speeds
    await this.toldFuel.navigateToTab()
    await this.toldFuel.waitForVisible()
    await this.toldFuel.fillRotationSpeed('120')
    await this.toldFuel.fillRefusalSpeed('100')
  }
}
