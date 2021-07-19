import React, { useLayoutEffect, useRef } from 'react'

export const useClickOutside = (callback, refFromProps) => {
  const ref = refFromProps ? refFromProps : useRef()

  useLayoutEffect(() => {
    function handleClickOutside(event) {
      if (ref.current && !ref.current.contains(event.target)) {
        callback()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [ref, callback])

  return ref
}
