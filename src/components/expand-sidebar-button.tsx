import { BsLayoutSidebarInset, BsLayoutSidebarInsetReverse } from 'react-icons/bs'

import { useState } from 'react'
import { c } from '../c.ts'

export function ExpandSidebarButton() {
  const [isExpanded, setIsExpanded] = useState(false)
  const IconComponent = isExpanded ? BsLayoutSidebarInsetReverse : BsLayoutSidebarInset

  return (
    <button
      className={c(
        'flex cursor-pointer items-center justify-center rounded-md px-0.75 py-0.5 hover:bg-gray-200 hover:text-black',
        {
          'text-gray-400': !isExpanded,
          'bg-gray-100 text-black': isExpanded,
        },
      )}
      onClick={() => setIsExpanded((prev) => !prev)}
    >
      <IconComponent className={'text-lg'} />
    </button>
  )
}
