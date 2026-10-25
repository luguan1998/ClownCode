/**
 * Jupyter notebook types for NotebookEditTool. Type-only module.
 */

export type NotebookCellType = 'code' | 'markdown' | 'raw'

export interface NotebookOutputImage {
  image_data: string
  media_type: 'image/png' | 'image/jpeg'
}

export interface NotebookCellOutput {
  output_type: string
  text?: string | string[]
  data?: Record<string, unknown>
  [key: string]: unknown
}

/** Raw cell as stored in the .ipynb JSON. */
export interface NotebookCell {
  id?: string
  cell_type: NotebookCellType | string
  source: string | string[]
  execution_count?: number | null
  outputs?: NotebookCellOutput[]
  metadata?: Record<string, unknown>
  language?: string
}

/** Processed cell used for model-facing content. */
export interface NotebookCellSourceOutput {
  output_type: string
  text?: string
  image?: NotebookOutputImage
  [key: string]: unknown
}

export interface NotebookCellSource {
  cellType: string
  source: string
  execution_count?: number
  cell_id?: string
  language?: string
  outputs?: NotebookCellSourceOutput[]
}

export interface NotebookContent {
  cells: NotebookCell[]
  metadata: {
    language_info?: { name?: string; [key: string]: unknown }
    [key: string]: unknown
  }
  nbformat: number
  nbformat_minor?: number
}
