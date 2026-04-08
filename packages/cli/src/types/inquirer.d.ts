/**
 * Minimal type declaration for inquirer v9.
 *
 * inquirer v9 ships as ESM-only without a compatible type entry for NodeNext
 * module resolution. This shim provides just enough typing for the prompt API.
 * The implementation is bundled by tsup via noExternal, so runtime types match.
 */

declare module 'inquirer' {
  type PromptType =
    | 'input'
    | 'number'
    | 'confirm'
    | 'list'
    | 'rawlist'
    | 'expand'
    | 'checkbox'
    | 'password'
    | 'editor'

  interface Choice {
    name: string
    value: unknown
    short?: string | undefined
  }

  interface Question {
    type?: PromptType | undefined
    name: string
    message: string | (() => string)
    default?: unknown
    choices?: Choice[] | readonly string[] | undefined
    validate?: ((input: string) => boolean | string | Promise<boolean | string>) | undefined
    filter?: ((input: string) => unknown) | undefined
    when?: boolean | ((answers: Record<string, unknown>) => boolean) | undefined
    prefix?: string | undefined
    suffix?: string | undefined
  }

  const inquirer: {
    prompt<T = Record<string, unknown>>(questions: Question[]): Promise<T>
    createPromptModule(): {
      prompt<T = Record<string, unknown>>(questions: Question[]): Promise<T>
    }
  }

  export default inquirer
}
