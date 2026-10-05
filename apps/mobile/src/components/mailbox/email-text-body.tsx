import React from "react"
import { Linking } from "react-native";
import { Text } from "@/design/text";
import type { IdnTheme } from "@/design/tokens"
import { splitEmailTextLinks } from "@/lib/email-links"

export function EmailTextBody({ text, t }: { text: string; t: IdnTheme }) {
  const parts = React.useMemo(() => splitEmailTextLinks(text), [text])

  return (
    <Text
      selectable
      style={{
        padding: 16,
        fontSize: 15,
        lineHeight: 24,
        color: t.ink2,
      }}
    >
      {parts.map((part, index) =>
        part.url ? (
          <Text
            key={`${part.url}-${index}`}
            accessibilityRole="link"
            onPress={() => void Linking.openURL(part.url!)}
            style={{
              color: t.dark ? "#58C985" : "#0E7C3A",
              textDecorationLine: "underline",
            }}
          >
            {part.text}
          </Text>
        ) : (
          <React.Fragment key={`text-${index}`}>{part.text}</React.Fragment>
        ),
      )}
    </Text>
  )
}
