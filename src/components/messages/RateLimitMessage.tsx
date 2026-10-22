import React from 'react'
import { Box, Text } from 'src/ink.js'

type RateLimitMessageProps = {
  text: string
  onOpenRateLimitOptions?: () => void
}

/**
 * OpenClaude: cloud subscription upsells were removed. Rate-limit responses
 * are rendered as a plain warning so providers can surface their own message.
 */
export function RateLimitMessage({ text }: RateLimitMessageProps) {
  return (
    <Box>
      <Text color="warning">{text}</Text>
    </Box>
  )
}
