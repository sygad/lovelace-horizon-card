import type { TemplateResult } from 'lit'
import { html, nothing, svg } from 'lit'

import type { IHorizonCardConfig, THorizonCardData, THorizonCardFields } from '../../types'
import { EHorizonCardI18NKeys } from '../../types'
import { HelperFunctions } from '../../utils/HelperFunctions'
import type { I18N } from '../../utils/I18N'

type TSlot = TemplateResult | typeof nothing

// Tile footer: rows of three tiles. The first row (sunrise / lux / sunset) is shown day and night.
// During the day the other rows show Sun data (dawn / solar noon / dusk, then azimuth / day length /
// elevation). With `night_swap`, between sunset and sunrise they show Moon data instead (moonrise /
// illumination / moonset, then azimuth / phase / elevation). A disabled field leaves its slot empty
// so the columns stay aligned; a row with every field disabled is dropped.
export class HorizonCardTiles {
  private readonly data: THorizonCardData
  private readonly i18n: I18N
  private readonly fields: THorizonCardFields
  private readonly southernFlip: boolean
  private readonly night: boolean

  constructor (config: IHorizonCardConfig, data: THorizonCardData, i18n: I18N) {
    this.data = data
    this.i18n = i18n
    this.fields = config.fields as THorizonCardFields
    this.southernFlip = config.southern_flip ?? false
    this.night = config.night_swap !== false && !HelperFunctions.isDaytime(data.sunData)
  }

  public render (): TemplateResult | typeof nothing {
    const rows = [this.sunTimesRow(), ...(this.night ? this.nightRows() : this.dayRows())]
    const visible = rows.filter((row) => row.some((slot) => slot !== nothing))
    if (visible.length === 0) {
      return nothing
    }

    return html`
      <div class="horizon-card-tiles ${this.night ? 'horizon-card-tiles-night' : 'horizon-card-tiles-day'}">
        ${visible.map((row) => row.map((slot) => slot === nothing
          ? html`<div class="horizon-card-tile-empty"></div>`
          : slot))}
      </div>
    `
  }

  private sunTimesRow (): TSlot[] {
    const times = this.data.sunData.times
    const sunrise = this.fields.sunrise_tile
      ? this.valueTile(EHorizonCardI18NKeys.Sunrise, times.sunrise, this.sunriseIcon()) : nothing
    const sunset = this.fields.sunset_tile
      ? this.valueTile(EHorizonCardI18NKeys.Sunset, times.sunset, this.sunsetIcon()) : nothing
    return [
      this.southernFlip ? sunset : sunrise,
      this.fields.lux ? this.tile(EHorizonCardI18NKeys.Lux, this.data.lux ?? '-', this.luxIcon()) : nothing,
      this.southernFlip ? sunrise : sunset
    ]
  }

  private dayRows (): TSlot[][] {
    const sun = this.data.sunData
    const dawn = this.fields.dawn ? this.valueTile(EHorizonCardI18NKeys.Dawn, sun.times.dawn, this.dawnIcon()) : nothing
    const dusk = this.fields.dusk ? this.valueTile(EHorizonCardI18NKeys.Dusk, sun.times.dusk, this.duskIcon()) : nothing
    return [
      [
        this.southernFlip ? dusk : dawn,
        this.fields.noon ? this.valueTile(EHorizonCardI18NKeys.Noon, sun.times.noon, this.noonIcon()) : nothing,
        this.southernFlip ? dawn : dusk
      ],
      [
        this.fields.sun_azimuth ? this.valueTile(EHorizonCardI18NKeys.Azimuth, sun.azimuth, this.azimuthIcon()) : nothing,
        this.fields.day_length ? this.tile(EHorizonCardI18NKeys.DayLength, this.dayLength(), this.dayLengthIcon()) : nothing,
        this.fields.sun_elevation ? this.valueTile(EHorizonCardI18NKeys.Elevation, sun.elevation, this.elevationIcon()) : nothing
      ]
    ]
  }

  private nightRows (): TSlot[][] {
    const moon = this.data.moonData
    const rise = this.fields.moonrise ? this.valueTile(EHorizonCardI18NKeys.Moonrise, moon.times.moonrise, this.moonriseIcon()) : nothing
    const set = this.fields.moonset ? this.valueTile(EHorizonCardI18NKeys.Moonset, moon.times.moonset, this.moonsetIcon()) : nothing
    return [
      [
        this.southernFlip ? set : rise,
        this.fields.moon_illumination
          ? this.tile(EHorizonCardI18NKeys.MoonIllumination,
            `${this.i18n.formatDecimal(Math.round(moon.fraction * 100))}%`, this.illuminationIcon())
          : nothing,
        this.southernFlip ? rise : set
      ],
      [
        this.fields.moon_azimuth ? this.valueTile(EHorizonCardI18NKeys.Azimuth, moon.azimuth, this.azimuthIcon()) : nothing,
        this.fields.moon_phase ? this.phaseTile() : nothing,
        this.fields.moon_elevation ? this.valueTile(EHorizonCardI18NKeys.Elevation, moon.elevation, this.elevationIcon()) : nothing
      ]
    ]
  }

  private tile (key: string, value: unknown, icon: TemplateResult): TemplateResult {
    return html`
      <div class="horizon-card-tile horizon-card-tile-${key}">
        ${icon}
        <span class="horizon-card-tile-name">${this.i18n.tr(key)}</span>
        <span class="horizon-card-tile-value">${value}</span>
      </div>
    `
  }

  // Times and degrees, formatted exactly like the classic fields
  private valueTile (key: string, value: Date | number | undefined, icon: TemplateResult): TemplateResult {
    return this.tile(key, HelperFunctions.fieldValueToString(this.i18n, key, value), icon)
  }

  // The phase name is long, so this tile shows only the icon and the name, with no label.
  private phaseTile (): TSlot {
    const phase = this.data.moonData.phase
    if (phase === undefined) {
      return nothing
    }
    return html`
      <div class="horizon-card-tile horizon-card-tile-moon_phase">
        ${this.phaseIcon()}
        <span class="horizon-card-tile-value">${this.i18n.tr(phase.state)}</span>
      </div>
    `
  }

  private dayLength (): string {
    const { sunrise, sunset } = this.data.sunData.times
    let minutes: number
    if (sunrise !== undefined && sunset !== undefined) {
      minutes = Math.round((sunset.getTime() - sunrise.getTime()) / 60000)
    } else {
      // Polar day or polar night
      minutes = this.data.sunData.elevation > 0 ? 24 * 60 : 0
    }
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`
  }

  // ---------- Icons (24x24, coloured through --hc-tile-* variables) ----------

  private icon (content: TemplateResult): TemplateResult {
    return html`<svg class="horizon-card-tile-icon" viewBox="0 0 24 24" aria-hidden="true">${content}</svg>`
  }

  private dawnIcon (): TemplateResult {
    return this.icon(svg`
      <circle class="hc-icon-track" cx="12" cy="12" r="10"/>
      <path class="hc-icon-dawn" d="M12 2a10 10 0 0 0 0 20a4.5 10 0 0 1 0-20z"/>`)
  }

  private duskIcon (): TemplateResult {
    return this.icon(svg`
      <circle class="hc-icon-track" cx="12" cy="12" r="10"/>
      <path class="hc-icon-dusk" d="M12 2a10 10 0 0 1 0 20a4.5 10 0 0 0 0-20z"/>`)
  }

  private noonIcon (): TemplateResult {
    return this.icon(svg`
      <circle class="hc-icon-track" cx="12" cy="12" r="10"/>
      <path class="hc-icon-noon" d="M12 2a10 10 0 0 0 0 20z"/>`)
  }

  private sunriseIcon (): TemplateResult {
    return this.icon(svg`
      <path class="hc-icon-twilight" d="M7 16a5 5 0 0 1 10 0z"/>
      <path class="hc-icon-line" d="M3 16h18M12 4.5v4M10 6.5l2-2 2 2M5.2 10.2l1.2 1.2M18.8 10.2l-1.2 1.2"/>`)
  }

  private sunsetIcon (): TemplateResult {
    return this.icon(svg`
      <path class="hc-icon-twilight" d="M7 16a5 5 0 0 1 10 0z"/>
      <path class="hc-icon-line" d="M3 16h18M12 4.5v4M10 6.5l2 2 2-2M5.2 10.2l1.2 1.2M18.8 10.2l-1.2 1.2"/>`)
  }

  private luxIcon (): TemplateResult {
    return this.icon(svg`
      <circle class="hc-icon-noon" cx="12" cy="12" r="4.5"/>
      <path class="hc-icon-rays" d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/>`)
  }

  private azimuthIcon (): TemplateResult {
    return this.icon(svg`
      <g class="hc-icon-line">
        <path d="M5 6v13M5 19l12-7"/>
        <path d="M5 12.5a6.5 6.5 0 0 1 5.6 2.8" stroke-dasharray="1.5 1.8"/>
      </g>
      <circle class="hc-icon-dot" cx="5" cy="4" r="1.8"/>
      <circle class="hc-icon-dot" cx="18" cy="11.5" r="1.4"/>`)
  }

  private elevationIcon (): TemplateResult {
    return this.icon(svg`
      <path class="hc-icon-line" d="M6 3h12M6 21h12M12 6v12M9 8.5l3-3 3 3M9 15.5l3 3 3-3"/>`)
  }

  private dayLengthIcon (): TemplateResult {
    return this.icon(svg`
      <path class="hc-icon-noon" d="M6.5 17a5.5 5.5 0 0 1 11 0z"/>
      <path class="hc-icon-line" d="M3 17h18M12 6.5v2M5.5 9.5l1.4 1.4M18.5 9.5l-1.4 1.4"/>`)
  }

  private moonriseIcon (): TemplateResult {
    return this.icon(svg`
      <path class="hc-icon-moon" d="M13 4.5a7 7 0 1 0 6 10.5a5.5 5.5 0 0 1-6-10.5z"/>
      <path class="hc-icon-line" d="M19 4v6M16.5 6.5L19 4l2.5 2.5"/>`)
  }

  private moonsetIcon (): TemplateResult {
    return this.icon(svg`
      <path class="hc-icon-moon" d="M13 4.5a7 7 0 1 0 6 10.5a5.5 5.5 0 0 1-6-10.5z"/>
      <path class="hc-icon-line" d="M19 4v6M16.5 7.5L19 10l2.5-2.5"/>`)
  }

  private illuminationIcon (): TemplateResult {
    return this.icon(svg`
      <circle class="hc-icon-line" cx="12" cy="12" r="5"/>
      <path class="hc-icon-moon-lit" d="M12 7a5 5 0 0 1 0 10z"/>
      <path class="hc-icon-line" d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>`)
  }

  // A disc lit by the Moon's real illuminated fraction. Waxing is lit on the right, waning on the
  // left (northern view); the whole icon is rotated by moon_phase_rotation like the classic icon.
  private phaseIcon (): TemplateResult {
    const moon = this.data.moonData
    // A few percent lit is only a sub-pixel sliver at 24px, so keep crescents and gibbous phases
    // within 15-85% to stay readable; new and full Moon stay exact.
    const raw = Math.min(1, Math.max(0, moon.fraction))
    const f = raw < 0.02 || raw > 0.98 ? raw : Math.min(0.85, Math.max(0.15, raw))
    const state = moon.phase?.state ?? ''
    const litRight = state.startsWith('waxing') || state === 'first_quarter' || state === 'new_moon'
    const rx = (10 * Math.abs(1 - 2 * f)).toFixed(2)
    const gibbous = f > 0.5
    const edgeSweep = litRight ? 1 : 0
    const terminatorSweep = litRight === gibbous ? 1 : 0
    return html`
      <svg class="horizon-card-tile-icon" viewBox="0 0 24 24" aria-hidden="true"
           style="transform: rotate(${moon.phaseRotation}deg)">
        <circle class="hc-icon-moon-dark" cx="12" cy="12" r="10"/>
        <path class="hc-icon-moon-lit" d="M12 2A10 10 0 0 ${edgeSweep} 12 22A${rx} 10 0 0 ${terminatorSweep} 12 2z"/>
      </svg>
    `
  }
}
