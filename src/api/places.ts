import { apiRequest } from './http'

export type PlaceSummary = {
  contentId: string
  name: string
  category: 'FOOD'
  categoryLabel: string
  distanceMeters: number
  walkingMinutes: number
  summary: string
  address: string
  telephone: string | null
  imageUrl: string | null
  thumbnailUrl: string | null
  copyrightType: string | null
  latitude: number
  longitude: number
}

export type PlaceSearchResult = {
  items: PlaceSummary[]
  page: number
  size: number
  totalCount: number
}

export type PlaceDetail = {
  contentId: string
  name: string
  category: 'FOOD'
  categoryLabel: string
  address: string
  telephone: string | null
  homepageUrl: string | null
  imageUrl: string | null
  thumbnailUrl: string | null
  copyrightType: string | null
  latitude: number | null
  longitude: number | null
  overview: string | null
  food: {
    openingHours: string | null
    restDate: string | null
    mainMenu: string | null
    menu: string | null
    menuItems: Array<{
      name: string
      price: number | null
      specialty: boolean
      imageUrl: string | null
    }>
    menuSource: string | null
    parking: string | null
    packing: string | null
    reservation: string | null
    creditCard: string | null
  }
  pet: {
    accompanimentType: string | null
    allowedAnimals: string | null
    requirements: string | null
    accidentPrecautions: string | null
    facilities: string | null
    furnishedItems: string | null
    purchasableItems: string | null
    rentableItems: string | null
    additionalInformation: string | null
  }
  galleryImages: Array<{
    name: string | null
    originalUrl: string
    thumbnailUrl: string | null
    copyrightType: string | null
  }>
  amenities: string[]
}

export type PlaceApi = {
  listJungGu(input: { latitude: number; longitude: number; page?: number; size?: number }): Promise<PlaceSearchResult>
  detail(contentId: string): Promise<PlaceDetail>
}

export const placeApi: PlaceApi = {
  listJungGu({ latitude, longitude, page = 1, size = 100 }) {
    const params = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      page: String(page),
      size: String(size),
    })
    return apiRequest<PlaceSearchResult>(`/api/places/restaurants/areas/seoul-jung-gu?${params.toString()}`, {}, { authenticated: false })
  },
  detail(contentId) {
    return apiRequest<PlaceDetail>(`/api/places/restaurants/${encodeURIComponent(contentId)}`, {}, { authenticated: false })
  },
}
