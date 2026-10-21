import { useDefinitionHover } from '@/src/hooks/use-definition-hover.ts'
import { useDefinitionLookup } from '@/src/hooks/use-definition-lookup.ts'
import { useDefinitionNavigation } from '@/src/hooks/use-definition-navigation.ts'

export const useDefinitionInteractions = (path: string) => {
  const navigation = useDefinitionNavigation()
  const hover = useDefinitionHover(path, navigation.navigate)
  const lookup = useDefinitionLookup(hover.token, hover.visible)

  return {
    tokenHandlers: hover.tokenHandlers,
    definition: {
      token: hover.token,
      visible: hover.visible,
      state: lookup,
      popover: hover.popover,
      onOpen: navigation.open,
    },
  }
}
