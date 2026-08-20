import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MapPlaceSearch } from './MapPlaceSearch'
import { placeApiStub } from '../../test/placeApiStub'

describe('MapPlaceSearch', () => {
  it('connects search, category markers, preview, and the shared detail sheet', async () => {
    const onMarkersChange = vi.fn()
    const onDetailOpenChange = vi.fn()
    render(<MapPlaceSearch api={placeApiStub} onMarkersChange={onMarkersChange} onDetailOpenChange={onDetailOpenChange} />)

    fireEvent.click(screen.getByRole('button', { name: '장소 검색 열기' }))
    expect(screen.getByRole('search')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '동물병원' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '음식점' }))
    await waitFor(() => expect(onMarkersChange).toHaveBeenLastCalledWith(expect.arrayContaining([
      expect.objectContaining({ id: 'place:3012345', interactive: true }),
    ])))
    expect(onMarkersChange.mock.calls.at(-1)?.[0]).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'place:4012345' }),
    ]))

    fireEvent.click(screen.getByRole('button', { name: '카페' }))
    await waitFor(() => expect(onMarkersChange).toHaveBeenLastCalledWith(expect.arrayContaining([
      expect.objectContaining({ id: 'place:4012345', interactive: true }),
    ])))
    expect(onMarkersChange.mock.calls.at(-1)?.[0]).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'place:3012345' }),
    ]))

    fireEvent.click(screen.getByRole('button', { name: '음식점' }))

    fireEvent.click(screen.getByRole('button', { name: '도그라운지 성수, 620m' }))
    expect(await screen.findByRole('article', { name: '도그라운지 성수 장소 요약' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '길찾기' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '자세히 보기' }))
    expect(screen.getByRole('dialog', { name: '도그라운지 성수 상세 정보' })).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('서울 중구 을지로 100')).toBeInTheDocument())
    expect(screen.getByRole('img', { name: '도그라운지 성수 대표 이미지 영역' }).querySelector('img')).toHaveAttribute('src', 'https://example.com/gallery.jpg')
    expect(screen.getByRole('region', { name: '메뉴 정보' })).toHaveTextContent('반려견 동반 브런치')
    expect(screen.getByRole('region', { name: '메뉴 정보' })).toHaveTextContent('18,000원')
    expect(screen.getByRole('region', { name: '메뉴 정보' })).toHaveTextContent('매장 공개 메뉴')
    expect(onDetailOpenChange).toHaveBeenLastCalledWith(true)

    fireEvent.click(screen.getByRole('button', { name: '장소 상세 닫기' }))
    expect(screen.getByRole('article', { name: '도그라운지 성수 장소 요약' })).toBeInTheDocument()
    expect(onDetailOpenChange).toHaveBeenLastCalledWith(false)

    fireEvent.click(screen.getByRole('button', { name: '도그라운지 성수 요약 닫기' }))
    expect(screen.getByRole('region', { name: '지도 장소 검색' })).not.toHaveAttribute('data-selected-place')
    await waitFor(() => expect(onMarkersChange).toHaveBeenLastCalledWith(expect.arrayContaining([
      expect.objectContaining({ id: 'place:3012345', selected: false }),
    ])))
    expect(screen.getByRole('button', { name: '도그라운지 성수, 620m' })).toBeInTheDocument()
  })

  it('selects the first matching place when the search form is submitted', async () => {
    render(<MapPlaceSearch api={placeApiStub} />)

    fireEvent.click(screen.getByRole('button', { name: '장소 검색 열기' }))
    const input = screen.getByRole('textbox', { name: '장소 또는 주소 검색' })
    fireEvent.change(input, { target: { value: '동물메디컬' } })
    fireEvent.submit(screen.getByRole('search'))

    expect(await screen.findByRole('article', { name: '서울숲 동물메디컬센터 장소 요약' })).toBeInTheDocument()
    await screen.findByRole('button', { name: '장소 검색 열기' })
  })

  it('closes the result panel and marks the chosen place for map focus', async () => {
    const onMarkersChange = vi.fn()
    const onSearchOpenChange = vi.fn()
    render(<MapPlaceSearch api={placeApiStub} onMarkersChange={onMarkersChange} onSearchOpenChange={onSearchOpenChange} />)

    fireEvent.click(screen.getByRole('button', { name: '장소 검색 열기' }))
    const input = screen.getByRole('textbox', { name: '장소 또는 주소 검색' })
    fireEvent.change(input, { target: { value: '도그라운지' } })
    fireEvent.click(await screen.findByRole('option', { name: /도그라운지 성수/ }))

    await waitFor(() => expect(screen.queryByRole('listbox', { name: '장소 검색 결과' })).not.toBeInTheDocument())
    expect(await screen.findByRole('article', { name: '도그라운지 성수 장소 요약' })).toBeInTheDocument()
    expect(onSearchOpenChange).toHaveBeenLastCalledWith(false)
    await waitFor(() => expect(onMarkersChange).toHaveBeenLastCalledWith(expect.arrayContaining([
      expect.objectContaining({ id: 'place:3012345', selected: true }),
    ])))
  })

  it('explains an empty official Jung-gu result instead of showing places outside Jung-gu', async () => {
    render(<MapPlaceSearch api={{ ...placeApiStub, listJungGu: async () => ({ items: [], page: 1, size: 100, totalCount: 0 }) }} />)

    fireEvent.click(screen.getByRole('button', { name: '장소 검색 열기' }))

    expect(await screen.findByText('현재 식품안전나라에서 확인된 서울 중구 음식점·카페가 없어요.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /도그라운지 성수/ })).not.toBeInTheDocument()
  })
})
