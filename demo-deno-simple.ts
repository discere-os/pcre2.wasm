/**
 * PCRE2.wasm Simple Demo
 * Quick demonstration of basic functionality
 */

import PCRE2 from './src/lib/index.ts'

async function simpleDemo() {
  console.log('🔍 PCRE2.wasm Simple Demo\n')

  // Initialize
  const pcre2 = new PCRE2()
  await pcre2.initialize()

  console.log('✅ Library initialized')

  // Simple test
  const isDate = pcre2.test('\\d{4}-\\d{2}-\\d{2}', '2023-12-25')
  console.log(`Date test: ${isDate ? 'Match ✅' : 'No match ❌'}`)

  // Pattern compilation
  const emailPattern = pcre2.compile('[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}')
  const emailTest = emailPattern.test('user@example.com')
  console.log(`Email test: ${emailTest ? 'Match ✅' : 'No match ❌'}`)

  emailPattern.destroy()
  console.log('🎉 Demo complete!')
}

if (import.meta.main) {
  await simpleDemo()
}