import { useArgs } from 'storybook/preview-api'
import { fn } from 'storybook/test'
import { DefinitionPopover } from '@/src/components/definitions/definition-popover.tsx'
import { type StressData, stressDataset } from '@/src/stories/support/definition-stress-fixture.ts'
import { StressFrame } from '@/src/stories/support/stress-frame.tsx'
import { StoryTokenAnchor } from '@/src/stories/support/story-token-anchor.tsx'

const popover = { onPointerEnter: fn(), onPointerLeave: fn(), close: fn() }

export function StressPopoversStory({ data }: { data: StressData }) {
  const [, updateArgs] = useArgs<{ data: StressData }>()

  return (
    <StressFrame
      data={data}
      onData={(next) => {
        updateArgs({ data: next })
      }}
    >
      <div className={'flex flex-col pb-16'}>
        {stressDataset(data).popovers.map((item) => {
          return (
            <div key={item.label} style={{ height: 210 }}>
              <span className={'px-6 text-fg-muted'}>{item.label}</span>
              <StoryTokenAnchor text={'symbol'}>
                {(token) => {
                  return (
                    <DefinitionPopover
                      token={token}
                      visible
                      state={item.state}
                      popover={popover}
                      onOpen={fn()}
                    />
                  )
                }}
              </StoryTokenAnchor>
            </div>
          )
        })}
      </div>
    </StressFrame>
  )
}
