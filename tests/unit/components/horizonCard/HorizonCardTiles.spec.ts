import { NumberFormat, TimeFormat } from 'custom-card-helpers'

import { HorizonCardTiles } from '../../../../src/components/horizonCard'
import { Constants } from '../../../../src/constants'
import type { IHorizonCardConfig, THorizonCardData, THorizonCardFields } from '../../../../src/types'
import { I18N } from '../../../../src/utils/I18N'
import { TemplateResultTestHelper } from '../../../helpers/TestHelpers'

describe('HorizonCardTiles', () => {
  const i18n = new I18N('en', 'UTC', TimeFormat.twenty_four, NumberFormat.language)

  const allFields: THorizonCardFields = {
    dawn: true, noon: true, dusk: true, sun_azimuth: true, day_length: true, sun_elevation: true,
    moonrise: true, moon_illumination: true, moonset: true, moon_azimuth: true, moon_phase: true, moon_elevation: true
  }

  const makeData = (now: string, sunElevation = 20): THorizonCardData => ({
    ...Constants.DEFAULT_CARD_DATA,
    sunData: {
      ...Constants.DEFAULT_CARD_DATA.sunData,
      azimuth: 134.4,
      elevation: sunElevation,
      times: {
        now: new Date(now),
        dawn: new Date('2026-10-12T05:59:00Z'),
        sunrise: new Date('2026-10-12T06:34:00Z'),
        noon: new Date('2026-10-12T11:59:00Z'),
        sunset: new Date('2026-10-12T17:25:00Z'),
        dusk: new Date('2026-10-12T18:00:00Z'),
        midnight: new Date('2026-10-12T00:00:00Z')
      }
    },
    moonData: {
      ...Constants.DEFAULT_CARD_DATA.moonData,
      azimuth: 255,
      elevation: -21.3,
      fraction: 0.064,
      phase: Constants.MOON_PHASES.waxingCrescentMoon,
      times: {
        now: new Date(now),
        moonrise: new Date('2026-10-12T09:08:00Z'),
        moonset: new Date('2026-10-12T17:28:00Z')
      }
    }
  })

  const render = (config: Partial<IHorizonCardConfig>, data: THorizonCardData) =>
    TemplateResultTestHelper.renderElement(new HorizonCardTiles({
      type: 'horizon-card', southern_flip: false, fields: allFields, ...config
    } as IHorizonCardConfig, data, i18n))

  const tileKeys = (html: string) =>
    Array.from(html.matchAll(/horizon-card-tile horizon-card-tile-([a-z_]+)|horizon-card-tile-empty/g))
      .map((m) => m[1] ?? 'empty')

  it('shows Sun tiles during the day', async () => {
    const html = await render({}, makeData('2026-10-12T09:30:00Z'))
    expect(tileKeys(html)).toEqual(['dawn', 'noon', 'dusk', 'azimuth', 'day_length', 'elevation'])
    expect(html).toContain('horizon-card-tiles-day')
    expect(html).toContain('10h 51m')
    expect(html).toContain('134.4°')
  })

  it('shows Moon tiles at night', async () => {
    const html = await render({}, makeData('2026-10-12T20:45:00Z', -24.6))
    expect(tileKeys(html)).toEqual(['moonrise', 'moon_illumination', 'moonset', 'azimuth', 'moon_phase', 'elevation'])
    expect(html).toContain('horizon-card-tiles-night')
    expect(html).toContain('6%')
    expect(html).toContain('Waxing crescent')
    expect(html).toContain('-21.3°')
  })

  it('treats the time before sunrise as night', async () => {
    const html = await render({}, makeData('2026-10-12T03:15:00Z', -27.9))
    expect(html).toContain('horizon-card-tiles-night')
  })

  it('keeps Sun tiles at night when night_swap is off', async () => {
    const html = await render({ night_swap: false }, makeData('2026-10-12T20:45:00Z', -24.6))
    expect(tileKeys(html)).toEqual(['dawn', 'noon', 'dusk', 'azimuth', 'day_length', 'elevation'])
  })

  it('leaves an empty slot for a hidden field so the columns stay aligned', async () => {
    const html = await render({ fields: { ...allFields, day_length: false } }, makeData('2026-10-12T09:30:00Z'))
    expect(tileKeys(html)).toEqual(['dawn', 'noon', 'dusk', 'azimuth', 'empty', 'elevation'])
  })

  it('drops a row whose fields are all hidden', async () => {
    const html = await render({
      fields: { ...allFields, sun_azimuth: false, day_length: false, sun_elevation: false }
    }, makeData('2026-10-12T09:30:00Z'))
    expect(tileKeys(html)).toEqual(['dawn', 'noon', 'dusk'])
  })

  it('shows the sunrise / lux / sunset row first, day and night', async () => {
    const fields = { ...allFields, sunrise_tile: true, lux: true, sunset_tile: true }
    const day = makeData('2026-10-12T09:30:00Z')
    const dayHtml = await render({ fields }, { ...day, lux: '12,000' })
    expect(tileKeys(dayHtml).slice(0, 3)).toEqual(['sunrise', 'lux', 'sunset'])
    expect(dayHtml).toContain('12,000')

    const nightHtml = await render({ fields }, makeData('2026-10-12T20:45:00Z', -24.6))
    expect(tileKeys(nightHtml).slice(0, 4)).toEqual(['sunrise', 'lux', 'sunset', 'moonrise'])
  })

  it('shows a dash in the lux tile when the sensor has no value', async () => {
    const fields = { lux: true }
    const html = await render({ fields }, makeData('2026-10-12T09:30:00Z'))
    expect(tileKeys(html)).toEqual(['empty', 'lux', 'empty'])
    expect(html).toMatch(/horizon-card-tile-value">(<!--[^>]*-->)?-</)
  })

  it('swaps sunrise and sunset with the southern flip', async () => {
    const html = await render({ southern_flip: true, fields: { sunrise_tile: true, sunset_tile: true } },
      makeData('2026-10-12T09:30:00Z'))
    expect(tileKeys(html)).toEqual(['sunset', 'empty', 'sunrise'])
  })

  it('renders nothing when every field is hidden', async () => {
    const none = Object.fromEntries(Object.keys(allFields).map((k) => [k, false]))
    const html = await render({ fields: none }, makeData('2026-10-12T09:30:00Z'))
    expect(tileKeys(html)).toEqual([])
  })

  it('swaps dawn and dusk with the southern flip', async () => {
    const html = await render({ southern_flip: true }, makeData('2026-10-12T09:30:00Z'))
    expect(tileKeys(html).slice(0, 3)).toEqual(['dusk', 'noon', 'dawn'])
  })

  it('shows a full day length during polar day', async () => {
    const data = makeData('2026-10-12T09:30:00Z')
    const times = { ...data.sunData.times, sunrise: undefined, sunset: undefined }
    const html = await render({}, { ...data, sunData: { ...data.sunData, times } })
    expect(html).toContain('24h 0m')
  })
})
