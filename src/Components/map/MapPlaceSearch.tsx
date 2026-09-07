import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import type { CSSProperties, FormEvent, PointerEvent as ReactPointerEvent, RefObject } from 'react'
import { AnimatePresence, LayoutGroup, motion, useDragControls, useReducedMotion } from 'motion/react'
import { Clock3, Coffee, Info, MapPin, Navigation, PawPrint, Pill, Search, ShoppingBag, Stethoscope, Utensils, X } from 'lucide-react'
import { placeApi as defaultPlaceApi } from '../../api/places'
import type { PlaceApi, PlaceDetail, PlaceSummary } from '../../api/places'
import type { MapMarker } from './types'
import '../../styles/components/map-place-search.css'

export type PlaceCategory = 'restaurant' | 'hospital' | 'pharmacy' | 'cafe' | 'convenience'

export type MapPlace = {
  id: string
  name: string
  category: PlaceCategory
  categoryLabel: string
  markerLabel: string
  distance: string
  walkingTime: string
  summary: string
  address: string
  hours: string
  petPolicy: string
  amenities: string[]
  position: { latitude: number; longitude: number }
  staticPosition: { x: number; y: number }
  source?: 'food-safety' | 'mock'
  imageUrl?: string
  overview?: string
  menuItems?: Array<{
    name: string
    price: number | null
    specialty: boolean
    imageUrl?: string
  }>
  menuSource?: string
}

type MapOrigin = { latitude: number; longitude: number }

const categories: Array<{ id: PlaceCategory; label: string }> = [
  { id: 'restaurant', label: '음식점' },
  { id: 'hospital', label: '동물병원' },
  { id: 'pharmacy', label: '약국' },
  { id: 'cafe', label: '카페' },
  { id: 'convenience', label: '편의점' },
]

type PlaceCategoryGlyphProps = {
  category: PlaceCategory
  size?: number
}

function PlaceCategoryGlyph({ category, size = 16 }: PlaceCategoryGlyphProps) {
  const props = { size, strokeWidth: 2.15, 'aria-hidden': true as const }
  switch (category) {
    case 'restaurant': return <Utensils {...props} />
    case 'hospital': return <Stethoscope {...props} />
    case 'pharmacy': return <Pill {...props} />
    case 'cafe': return <Coffee {...props} />
    case 'convenience': return <ShoppingBag {...props} />
  }
}

const mockPlaces: MapPlace[] = [
  {
    id: 'dog-lounge-seongsu',
    name: '도그라운지 성수',
    category: 'restaurant',
    categoryLabel: '반려견 동반 음식점',
    markerLabel: '식',
    distance: '620m',
    walkingTime: '도보 9분',
    summary: '전 구역 동반 · 목줄 필요',
    address: '서울 성동구 성수동2가 289-5',
    hours: '영업 중 · 21:00 영업 종료',
    petPolicy: '실내 전 구역 동반 가능 · 목줄 착용 필요',
    amenities: ['물그릇', '유모차 출입', '야외 좌석'],
    position: { latitude: 37.5652, longitude: 126.9992 },
    staticPosition: { x: 65, y: 35 },
  },
  {
    id: 'forest-table',
    name: '포레스트 테이블',
    category: 'restaurant',
    categoryLabel: '반려견 동반 음식점',
    markerLabel: '식',
    distance: '840m',
    walkingTime: '도보 12분',
    summary: '야외 좌석 동반 가능',
    address: '서울 성동구 연무장길 18',
    hours: '영업 중 · 22:00 영업 종료',
    petPolicy: '야외 좌석에서 동반 가능 · 이동장 권장',
    amenities: ['야외 좌석', '물그릇'],
    position: { latitude: 37.563, longitude: 126.9968 },
    staticPosition: { x: 28, y: 47 },
  },
  {
    id: 'seoul-animal-medical',
    name: '서울숲 동물메디컬센터',
    category: 'hospital',
    categoryLabel: '동물병원',
    markerLabel: '병',
    distance: '1.1km',
    walkingTime: '도보 16분',
    summary: '진료 중 · 예약 권장',
    address: '서울 성동구 왕십리로 109',
    hours: '진료 중 · 20:00 접수 마감',
    petPolicy: '대기 시 리드줄 또는 이동장 이용',
    amenities: ['주차', '야간 진료', '대형견 진료'],
    position: { latitude: 37.5664, longitude: 127.0011 },
    staticPosition: { x: 77, y: 44 },
  },
  {
    id: 'green-pharmacy',
    name: '그린동물약국',
    category: 'pharmacy',
    categoryLabel: '동물의약품 취급 약국',
    markerLabel: '약',
    distance: '730m',
    walkingTime: '도보 10분',
    summary: '동물의약품 취급',
    address: '서울 성동구 아차산로 92',
    hours: '영업 중 · 20:30 영업 종료',
    petPolicy: '매장 입구에서 직원에게 문의',
    amenities: ['동물의약품', '전화 문의'],
    position: { latitude: 37.5629, longitude: 126.9998 },
    staticPosition: { x: 63, y: 57 },
  },
  {
    id: 'mellow-paw-cafe',
    name: '멜로우 포우 카페',
    category: 'cafe',
    categoryLabel: '반려견 동반 카페',
    markerLabel: '카',
    distance: '510m',
    walkingTime: '도보 7분',
    summary: '실내 동반 · 펫티켓 준수',
    address: '서울 성동구 서울숲4길 21',
    hours: '영업 중 · 22:00 영업 종료',
    petPolicy: '실내 동반 가능 · 좌석에서는 리드줄 고정',
    amenities: ['물그릇', '펫 전용 메뉴', '포토존'],
    position: { latitude: 37.5657, longitude: 126.9962 },
    staticPosition: { x: 37, y: 32 },
  },
  {
    id: 'forest-convenience',
    name: '서울숲 편의점',
    category: 'convenience',
    categoryLabel: '편의점',
    markerLabel: '편',
    distance: '390m',
    walkingTime: '도보 5분',
    summary: '24시간 운영',
    address: '서울 성동구 서울숲2길 8',
    hours: '24시간 영업',
    petPolicy: '반려견은 안고 입장하거나 이동장 이용',
    amenities: ['24시간', '간편 결제'],
    position: { latitude: 37.5648, longitude: 126.9954 },
    staticPosition: { x: 23, y: 61 },
  },
]

const supplementalMockPlaces = mockPlaces.filter((place) => place.category !== 'restaurant' && place.category !== 'cafe')
const JUNG_GU_CENTER: MapOrigin = { latitude: 37.564, longitude: 126.997 }
const DEMO_PLACE_IMAGE = '/assets/places/demo-dog-friendly-cafe.webp'

const formatDistance = (meters: number) => meters < 1000 ? `${Math.max(0, Math.round(meters))}m` : `${(meters / 1000).toFixed(1)}km`
const formatMenuPrice = (price: number | null) => price == null ? '가격 변동 · 매장 확인' : `${price.toLocaleString('ko-KR')}원`

const inferFoodCategory = (...values: Array<string | null | undefined>): Extract<PlaceCategory, 'restaurant' | 'cafe'> => {
  const text = values.filter(Boolean).join(' ').toLocaleLowerCase('ko-KR')
  return /카페|커피|coffee|cafe|베이커리|디저트/.test(text) ? 'cafe' : 'restaurant'
}

const categoryFromOfficialLabel = (label: string | null | undefined): Extract<PlaceCategory, 'restaurant' | 'cafe'> | undefined => {
  if (!label) return undefined
  if (label.includes('카페')) return 'cafe'
  if (label.includes('음식점')) return 'restaurant'
  return undefined
}

const toStaticPosition = (latitude: number, longitude: number) => ({
  x: Math.min(92, Math.max(8, ((longitude - 126.96) / 0.07) * 84 + 8)),
  y: Math.min(88, Math.max(12, ((37.58 - latitude) / 0.04) * 76 + 12)),
})

const mapPlaceSummary = (place: PlaceSummary): MapPlace => {
  const category = categoryFromOfficialLabel(place.categoryLabel) ?? inferFoodCategory(place.name, place.summary)
  return {
    id: place.contentId,
    name: place.name,
    category,
    categoryLabel: place.categoryLabel || (category === 'cafe' ? '반려견 동반 카페' : '반려견 동반 음식점'),
    markerLabel: category === 'cafe' ? '카' : '식',
    distance: formatDistance(place.distanceMeters),
    walkingTime: `도보 ${Math.max(1, place.walkingMinutes)}분`,
    summary: place.summary || '반려견 동반 정보를 확인해 보세요',
    address: place.address || '주소 정보 없음',
    hours: '상세 정보에서 영업시간 확인',
    petPolicy: place.summary || '반려견 동반 정보를 확인해 주세요',
    amenities: [],
    position: { latitude: place.latitude, longitude: place.longitude },
    staticPosition: toStaticPosition(place.latitude, place.longitude),
    source: 'food-safety',
    imageUrl: place.imageUrl ?? place.thumbnailUrl ?? DEMO_PLACE_IMAGE,
  }
}

const mergePlaceDetail = (place: MapPlace, detail: PlaceDetail): MapPlace => {
  const category = categoryFromOfficialLabel(detail.categoryLabel)
    ?? inferFoodCategory(detail.name, detail.food.mainMenu, detail.food.menu)
  const petPolicy = [detail.pet.accompanimentType, detail.pet.requirements, detail.pet.allowedAnimals]
    .filter((value): value is string => Boolean(value?.trim()))
    .filter((value, index, values) => values.indexOf(value) === index)
    .join(' · ')
  const galleryImage = detail.galleryImages.find((image) => image.originalUrl)?.originalUrl

  return {
    ...place,
    name: detail.name || place.name,
    category,
    categoryLabel: detail.categoryLabel || place.categoryLabel,
    markerLabel: category === 'cafe' ? '카' : '식',
    address: detail.address || place.address,
    hours: detail.food.openingHours || '영업시간 정보 없음',
    petPolicy: petPolicy || '반려견 동반 상세 정보 없음',
    amenities: detail.amenities.length > 0 ? detail.amenities : place.amenities,
    imageUrl: galleryImage ?? detail.imageUrl ?? detail.thumbnailUrl ?? place.imageUrl ?? DEMO_PLACE_IMAGE,
    overview: detail.overview ?? undefined,
    menuItems: (detail.food.menuItems ?? []).map((item) => ({
      ...item,
      imageUrl: item.imageUrl ?? undefined,
    })),
    menuSource: detail.food.menuSource ?? undefined,
  }
}

const springTransition = { type: 'spring' as const, stiffness: 380, damping: 36, mass: 0.86 }
const reducedTransition = { duration: 0.01 }

type MapSearchButtonProps = {
  onOpen: () => void
  buttonRef?: RefObject<HTMLButtonElement | null>
}

export function MapSearchButton({ onOpen, buttonRef }: MapSearchButtonProps) {
  return (
    <motion.button
      ref={buttonRef}
      layoutId="map-search-surface"
      className="map-search-button"
      type="button"
      aria-label="장소 검색 열기"
      aria-expanded="false"
      onClick={onOpen}
      whileTap={{ scale: 0.94 }}
    >
      <Search size={20} strokeWidth={2} aria-hidden="true" />
    </motion.button>
  )
}

type MapSearchBarProps = {
  value: string
  inputRef?: RefObject<HTMLInputElement | null>
  onChange: (value: string) => void
  onClose: () => void
  onSubmit: () => void
}

export function MapSearchBar({ value, inputRef, onChange, onClose, onSubmit }: MapSearchBarProps) {
  const submit = (event: FormEvent) => {
    event.preventDefault()
    onSubmit()
  }

  return (
    <form className="map-search-bar" role="search" onSubmit={submit}>
      <Search size={20} strokeWidth={2} aria-hidden="true" />
      <label className="sr-only" htmlFor="map-place-search-input">장소 또는 주소 검색</label>
      <input
        ref={inputRef}
        id="map-place-search-input"
        value={value}
        placeholder="장소, 주소 검색"
        autoComplete="off"
        onChange={(event) => onChange(event.target.value)}
      />
      <button type="button" onClick={onClose}>닫기</button>
    </form>
  )
}

type SearchCategoryChipsProps = {
  selected?: PlaceCategory
  onSelect: (category: PlaceCategory) => void
}

export function SearchCategoryChips({ selected, onSelect }: SearchCategoryChipsProps) {
  return (
    <motion.div
      className="map-search-categories"
      aria-label="장소 유형"
      initial="hidden"
      animate="visible"
      variants={{ visible: { transition: { staggerChildren: 0.045, delayChildren: 0.04 } } }}
    >
      {categories.map((category) => (
        <motion.button
          key={category.id}
          type="button"
          aria-pressed={selected === category.id}
          onClick={() => onSelect(category.id)}
          variants={{ hidden: { opacity: 0, y: -5 }, visible: { opacity: 1, y: 0 } }}
          whileTap={{ scale: 0.96 }}
        >
          <PlaceCategoryGlyph category={category.id} size={14} />
          <span>{category.label}</span>
        </motion.button>
      ))}
    </motion.div>
  )
}

type PlaceMarkerProps = {
  place: MapPlace
  selected: boolean
  onSelect: () => void
  delay?: number
}

export function PlaceMarker({ place, selected, onSelect, delay = 0 }: PlaceMarkerProps) {
  return (
    <motion.button
      layout
      type="button"
      className="map-place-marker"
      data-selected={selected || undefined}
      data-category={place.category}
      style={{ left: `${place.staticPosition.x}%`, top: `${place.staticPosition.y}%` }}
      aria-label={`${place.name}, ${place.distance}`}
      onClick={onSelect}
      initial={{ opacity: 0, scale: 0, y: 7 }}
      animate={{ opacity: 1, scale: selected ? 1.12 : 1, y: selected ? -4 : 0 }}
      exit={{ opacity: 0, scale: 0.78, y: 5 }}
      transition={{ ...springTransition, delay }}
      whileTap={{ scale: 0.92 }}
    >
      {selected && <span className="map-place-marker__halo" aria-hidden="true" />}
      <span className="map-place-marker__icon"><PlaceCategoryGlyph category={place.category} size={16} /></span>
      <AnimatePresence initial={false}>
        {selected && (
          <motion.span
            className="map-place-marker__label"
            initial={{ opacity: 0, width: 0, x: -4 }}
            animate={{ opacity: 1, width: 'auto', x: 0 }}
            exit={{ opacity: 0, width: 0, x: -4 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            {place.name}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  )
}

type PlacePreviewCardProps = {
  place: MapPlace
  onRoute: () => void
  onDetails: () => void
  onDismiss: () => void
  detailsButtonRef?: RefObject<HTMLButtonElement | null>
}

export function PlacePreviewCard({ place, onRoute, onDetails, onDismiss, detailsButtonRef }: PlacePreviewCardProps) {
  return (
    <motion.article
      layoutId={`place-card-${place.id}`}
      className="map-place-card map-place-card--preview"
      aria-label={`${place.name} 장소 요약`}
      transition={springTransition}
    >
      <button type="button" className="map-place-card__preview-close" aria-label={`${place.name} 요약 닫기`} onClick={onDismiss}><X size={17} /></button>
      <motion.h2 layout="position">{place.name}</motion.h2>
      <motion.p layout="position" className="map-place-card__meta">{place.distance} · {place.walkingTime} · {place.categoryLabel}</motion.p>
      <motion.p layout="position" className="map-place-card__summary">{place.summary}</motion.p>
      <motion.div layout="position" className="map-place-card__actions">
        <button type="button" className="map-place-card__secondary" onClick={onRoute}>길찾기</button>
        <button ref={detailsButtonRef} type="button" className="map-place-card__primary" onClick={onDetails}>자세히 보기</button>
      </motion.div>
    </motion.article>
  )
}

type PlaceDetailSheetProps = {
  place: MapPlace
  onRoute: () => void
  onClose: () => void
  loading?: boolean
  error?: string
}

export function PlaceDetailSheet({ place, onRoute, onClose, loading = false, error }: PlaceDetailSheetProps) {
  const dragControls = useDragControls()
  const reduceMotion = useReducedMotion()
  const itemVariants = {
    hidden: { opacity: 0, y: reduceMotion ? 0 : 8 },
    visible: { opacity: 1, y: 0 },
  }

  return (
    <motion.article
      layoutId={`place-card-${place.id}`}
      className="map-place-card map-place-card--detail"
      role="dialog"
      aria-modal="true"
      aria-label={`${place.name} 상세 정보`}
      drag="y"
      dragListener={false}
      dragControls={dragControls}
      dragConstraints={{ top: 0, bottom: 150 }}
      dragElastic={{ top: 0, bottom: 0.22 }}
      onDragEnd={(_, info) => {
        if (info.offset.y > 88 || info.velocity.y > 650) onClose()
      }}
      transition={reduceMotion ? reducedTransition : springTransition}
    >
      <button
        type="button"
        className="map-place-card__drag-handle"
        aria-label="아래로 밀어 상세 정보 닫기"
        onPointerDown={(event: ReactPointerEvent<HTMLButtonElement>) => dragControls.start(event)}
      ><span /></button>
      <motion.div
        className="map-place-card__detail-scroll"
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: reduceMotion ? 0 : 0.045, delayChildren: reduceMotion ? 0 : 0.08 } } }}
      >
        <motion.div className="map-place-card__hero" role="img" aria-label={`${place.name} 대표 이미지 영역`} variants={itemVariants}>
          {place.imageUrl ? <img src={place.imageUrl} alt="" /> : <PawPrint size={42} strokeWidth={1.6} aria-hidden="true" />}
          <span>{place.categoryLabel}</span>
        </motion.div>
        <motion.div className="map-place-card__detail-heading" variants={itemVariants}>
          <span className="map-place-card__eyebrow">장소 상세</span>
          <h2>{place.name}</h2>
          <p>{place.categoryLabel} · {place.distance} · {place.walkingTime}</p>
          {loading && <p className="map-place-card__detail-status" role="status">상세 정보와 사진을 불러오는 중...</p>}
          {error && <p className="map-place-card__detail-status map-place-card__detail-status--error" role="alert">{error}</p>}
          {!loading && !error && place.overview && <p className="map-place-card__overview">{place.overview}</p>}
        </motion.div>

        <motion.dl className="map-place-card__details" variants={itemVariants}>
          <div><dt><MapPin size={17} /> 주소</dt><dd>{place.address}</dd></div>
          <div><dt><Clock3 size={17} /> 영업 정보</dt><dd>{place.hours}</dd></div>
          <div><dt><PawPrint size={17} /> 반려견 동반</dt><dd>{place.petPolicy}</dd></div>
          <div><dt><Info size={17} /> 편의 정보</dt><dd className="map-place-card__amenities">{place.amenities.length > 0 ? place.amenities.map((item) => <span key={item}>{item}</span>) : <span>정보 준비 중</span>}</dd></div>
        </motion.dl>

        {!loading && (
          <motion.section className="map-place-card__menu" aria-label="메뉴 정보" variants={itemVariants}>
            <div className="map-place-card__menu-heading">
              <h3><Utensils size={17} /> 메뉴</h3>
              {place.menuSource && <span>{place.menuSource}</span>}
            </div>
            {place.menuItems && place.menuItems.length > 0 ? (
              <ul>
                {place.menuItems.slice(0, 8).map((menu, index) => (
                  <li
                    key={`${menu.name}-${index}`}
                    className={menu.imageUrl ? 'map-place-card__menu-item--with-image' : undefined}
                  >
                    {menu.imageUrl && <img src={menu.imageUrl} alt="" loading="lazy" />}
                    <span>
                      <strong>{menu.name}</strong>
                      {menu.specialty && <small>대표 메뉴</small>}
                    </span>
                    <b>{formatMenuPrice(menu.price)}</b>
                  </li>
                ))}
              </ul>
            ) : (
              <p>등록된 메뉴 정보가 없어요.</p>
            )}
          </motion.section>
        )}

        <motion.div className="map-place-card__detail-actions" variants={itemVariants}>
          <button type="button" className="map-place-card__route" onClick={onRoute}><Navigation size={18} /> 길찾기</button>
          <button type="button" className="map-place-card__dismiss" onClick={onClose}>닫기</button>
        </motion.div>
      </motion.div>
    </motion.article>
  )
}

type MapPlaceSearchProps = {
  className?: string
  isWalking?: boolean
  mapBottomInset?: string
  previewBottom?: string
  renderStaticMarkers?: boolean
  onMarkersChange?: (markers: MapMarker[]) => void
  onSearchOpenChange?: (open: boolean) => void
  onDetailOpenChange?: (open: boolean) => void
  onRoute?: (place: MapPlace) => void
  api?: PlaceApi
  origin?: MapOrigin
}

export type MapPlaceSearchHandle = {
  selectFeature: (featureId: string) => void
}

export const MapPlaceSearch = forwardRef<MapPlaceSearchHandle, MapPlaceSearchProps>(function MapPlaceSearch({ className = '', isWalking = false, mapBottomInset = '0px', previewBottom = '24px', renderStaticMarkers = true, onMarkersChange, onSearchOpenChange, onDetailOpenChange, onRoute, api = defaultPlaceApi, origin = JUNG_GU_CENTER }, ref) {
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState<PlaceCategory>()
  const [query, setQuery] = useState('')
  const [selectedPlace, setSelectedPlace] = useState<MapPlace>()
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [remoteFoodPlaces, setRemoteFoodPlaces] = useState<MapPlace[]>([])
  const [isFoodLoading, setIsFoodLoading] = useState(false)
  const [hasFoodLoaded, setHasFoodLoaded] = useState(false)
  const [foodError, setFoodError] = useState('')
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')
  const [routeNotice, setRouteNotice] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const openButtonRef = useRef<HTMLButtonElement>(null)
  const detailsButtonRef = useRef<HTMLButtonElement>(null)
  const foodLoadedRef = useRef(false)
  const foodLoadingRef = useRef(false)
  const detailCacheRef = useRef(new Map<string, MapPlace>())
  const reduceMotion = useReducedMotion()

  const changeSearchOpen = useCallback((open: boolean) => {
    setIsSearchOpen(open)
    onSearchOpenChange?.(open)
  }, [onSearchOpenChange])

  const allPlaces = useMemo(() => [...remoteFoodPlaces, ...supplementalMockPlaces], [remoteFoodPlaces])

  const loadJungGuFoods = useCallback(async () => {
    if (foodLoadedRef.current || foodLoadingRef.current) return
    foodLoadingRef.current = true
    setIsFoodLoading(true)
    setFoodError('')
    try {
      const response = await api.listJungGu({ latitude: origin.latitude, longitude: origin.longitude, size: 100 })
      setRemoteFoodPlaces(response.items.map(mapPlaceSummary))
      foodLoadedRef.current = true
      setHasFoodLoaded(true)
    } catch {
      setFoodError('서울 중구 음식점을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.')
    } finally {
      foodLoadingRef.current = false
      setIsFoodLoading(false)
    }
  }, [api, origin.latitude, origin.longitude])

  const visiblePlaces = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('ko-KR')
    if (!activeCategory && !normalizedQuery) return []
    return allPlaces.filter((place) => {
      const categoryMatches = !activeCategory || place.category === activeCategory
      const queryMatches = !normalizedQuery || [place.name, place.categoryLabel, place.address, place.summary]
        .some((value) => value.toLocaleLowerCase('ko-KR').includes(normalizedQuery))
      return categoryMatches && queryMatches
    })
  }, [activeCategory, allPlaces, query])

  useEffect(() => {
    onMarkersChange?.(visiblePlaces.map((place) => ({
      id: `place:${place.id}`,
      interactionId: `place:${place.id}`,
      interactive: true,
      categoryCode: place.markerLabel,
      category: place.category,
      selected: selectedPlace?.id === place.id,
      position: place.position,
      kind: 'default',
      label: place.name,
    })))
  }, [onMarkersChange, selectedPlace?.id, visiblePlaces])

  const selectPlace = useCallback((place: MapPlace) => {
    setSelectedPlace(place)
    setActiveCategory(place.category)
    setQuery('')
    setIsDetailOpen(false)
    onDetailOpenChange?.(false)
    requestAnimationFrame(() => changeSearchOpen(false))
  }, [changeSearchOpen, onDetailOpenChange])

  const selectFeature = useCallback((featureId: string) => {
    if (!featureId.startsWith('place:')) return
    const place = allPlaces.find((candidate) => `place:${candidate.id}` === featureId)
    if (!place) return
    selectPlace(place)
  }, [allPlaces, selectPlace])

  useImperativeHandle(ref, () => ({ selectFeature }), [selectFeature])

  useEffect(() => {
    if (!isSearchOpen) return
    const frame = requestAnimationFrame(() => inputRef.current?.focus())
    return () => cancelAnimationFrame(frame)
  }, [isSearchOpen])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (isDetailOpen) {
        setIsDetailOpen(false)
        onDetailOpenChange?.(false)
        requestAnimationFrame(() => detailsButtonRef.current?.focus())
        return
      }
      if (isSearchOpen) {
        changeSearchOpen(false)
        requestAnimationFrame(() => openButtonRef.current?.focus())
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [changeSearchOpen, isDetailOpen, isSearchOpen, onDetailOpenChange])

  const selectCategory = (category: PlaceCategory) => {
    if (category === 'restaurant' || category === 'cafe') void loadJungGuFoods()
    setActiveCategory(category)
    setQuery('')
    setSelectedPlace(undefined)
    setIsDetailOpen(false)
    onDetailOpenChange?.(false)
  }

  const submitSearch = () => {
    if (visiblePlaces[0]) selectPlace(visiblePlaces[0])
  }

  const closeSearch = () => {
    changeSearchOpen(false)
    requestAnimationFrame(() => openButtonRef.current?.focus())
  }

  const openSearch = () => {
    changeSearchOpen(true)
    void loadJungGuFoods()
  }

  const openDetails = async () => {
    if (!selectedPlace) return
    changeSearchOpen(false)
    setIsDetailOpen(true)
    setIsDetailLoading(false)
    setDetailError('')
    onDetailOpenChange?.(true)

    if (selectedPlace.source !== 'food-safety') return
    const cached = detailCacheRef.current.get(selectedPlace.id)
    if (cached) {
      setSelectedPlace(cached)
      return
    }

    setIsDetailLoading(true)
    try {
      const detail = await api.detail(selectedPlace.id)
      const merged = mergePlaceDetail(selectedPlace, detail)
      detailCacheRef.current.set(merged.id, merged)
      setSelectedPlace(merged)
      setRemoteFoodPlaces((places) => places.map((place) => place.id === merged.id ? merged : place))
    } catch {
      setDetailError('상세 정보를 불러오지 못했어요. 요약 정보는 계속 볼 수 있습니다.')
    } finally {
      setIsDetailLoading(false)
    }
  }

  const closeDetails = () => {
    setIsDetailOpen(false)
    onDetailOpenChange?.(false)
    requestAnimationFrame(() => detailsButtonRef.current?.focus())
  }

  const dismissPreview = () => {
    setSelectedPlace(undefined)
    setRouteNotice('')
    onDetailOpenChange?.(false)
  }

  const prepareRoute = () => {
    if (!selectedPlace) return
    onRoute?.(selectedPlace)
    setRouteNotice(`${selectedPlace.name}까지 길찾기를 준비했어요.`)
  }

  const style = {
    '--map-search-inset-bottom': mapBottomInset,
    '--place-preview-bottom': previewBottom,
  } as CSSProperties

  return (
    <LayoutGroup id={isWalking ? 'active-walk-place-search' : 'home-place-search'}>
      <section
        className={`map-place-search${isWalking ? ' map-place-search--walking' : ''} ${className}`.trim()}
        style={style}
        aria-label="지도 장소 검색"
        data-selected-place={selectedPlace?.id}
      >
        <AnimatePresence initial={false} mode="popLayout">
          {!isSearchOpen && !isDetailOpen && (
            <MapSearchButton key="search-button" buttonRef={openButtonRef} onOpen={openSearch} />
          )}
          {isSearchOpen && !isDetailOpen && (
            <motion.div
              key="search-panel"
              layoutId="map-search-surface"
              className="map-search-panel"
              transition={reduceMotion ? reducedTransition : springTransition}
            >
              <MapSearchBar value={query} inputRef={inputRef} onChange={(value) => { setQuery(value); setActiveCategory(undefined); if (value.trim()) void loadJungGuFoods() }} onClose={closeSearch} onSubmit={submitSearch} />
              <SearchCategoryChips selected={activeCategory} onSelect={selectCategory} />
              <AnimatePresence initial={false}>
                {(isFoodLoading || foodError || (hasFoodLoaded && remoteFoodPlaces.length === 0)) && (
                  <motion.p
                    className={`map-search-feedback${foodError ? ' map-search-feedback--error' : ''}`}
                    role={foodError ? 'alert' : 'status'}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                  >
                    {foodError || (isFoodLoading
                      ? '서울 중구 음식점과 카페를 불러오는 중...'
                      : '현재 식품안전나라에서 확인된 서울 중구 음식점·카페가 없어요.')}
                  </motion.p>
                )}
              </AnimatePresence>
              {query.trim() && visiblePlaces.length > 0 && (
                <motion.div className="map-search-results" role="listbox" aria-label="장소 검색 결과" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}>
                  {visiblePlaces.slice(0, 4).map((place) => (
                    <button key={place.id} type="button" role="option" aria-selected={selectedPlace?.id === place.id} onClick={() => selectPlace(place)}>
                      <span><strong>{place.name}</strong><small>{place.categoryLabel} · {place.distance}</small></span>
                      <MapPin size={17} aria-hidden="true" />
                    </button>
                  ))}
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {renderStaticMarkers && (
          <div className="map-place-search__static-markers" aria-label="검색된 장소">
            <AnimatePresence>
              {visiblePlaces.map((place, index) => <PlaceMarker key={place.id} place={place} selected={selectedPlace?.id === place.id} onSelect={() => selectPlace(place)} delay={Math.min(index * 0.055, 0.55)} />)}
            </AnimatePresence>
          </div>
        )}

        <AnimatePresence initial={false} mode="popLayout">
          {selectedPlace && !isSearchOpen && !isDetailOpen && (
            <PlacePreviewCard key={`preview-${selectedPlace.id}`} place={selectedPlace} onRoute={prepareRoute} onDetails={openDetails} onDismiss={dismissPreview} detailsButtonRef={detailsButtonRef} />
          )}
          {selectedPlace && isDetailOpen && (
            <PlaceDetailSheet key={`detail-${selectedPlace.id}`} place={selectedPlace} onRoute={prepareRoute} onClose={closeDetails} loading={isDetailLoading} error={detailError} />
          )}
        </AnimatePresence>

        <span className="map-place-search__status" role="status" aria-live="polite">{routeNotice}</span>
      </section>
    </LayoutGroup>
  )
})
