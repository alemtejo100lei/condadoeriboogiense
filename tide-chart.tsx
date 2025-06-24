"use client"

import type React from "react"

import { useState, useCallback, useMemo, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, FileSpreadsheet, Waves, Clock, Target, Trash2 } from "lucide-react"
import * as XLSX from "xlsx"
import { DatePicker } from "./components/date-picker"
import { format, isSameDay, parseISO } from "date-fns"
import { Button } from "@/components/ui/button"
import { TideChartGraph } from "./components/tide-chart-graph"
import { WindguruWidget } from "./components/windguru-widget"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"

interface TideData {
  data: string
  hora: string
  altura: number
  mare: string
}

interface HeightOccurrence {
  hora: string
  isExact: boolean
  isRising: boolean
}

const STORAGE_KEY = "tide-chart-data"
const STORAGE_FILENAME_KEY = "tide-chart-filename"

export default function TideChart() {
  const [tideData, setTideData] = useState<TideData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [fileName, setFileName] = useState<string>("")
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [isDaylightSaving, setIsDaylightSaving] = useState(false)
  const [targetHeight, setTargetHeight] = useState(2.4)

  // Load data from localStorage on component mount
  useEffect(() => {
    try {
      const savedData = localStorage.getItem(STORAGE_KEY)
      const savedFileName = localStorage.getItem(STORAGE_FILENAME_KEY)

      if (savedData) {
        const parsedData = JSON.parse(savedData)
        setTideData(parsedData)
      }

      if (savedFileName) {
        setFileName(savedFileName)
      }
    } catch (error) {
      console.error("Erro ao carregar dados salvos:", error)
    }
  }, [])

  // Save data to localStorage whenever tideData changes
  useEffect(() => {
    if (tideData.length > 0) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tideData))
      } catch (error) {
        console.error("Erro ao salvar dados:", error)
      }
    }
  }, [tideData])

  // Save filename to localStorage whenever it changes
  useEffect(() => {
    if (fileName) {
      try {
        localStorage.setItem(STORAGE_FILENAME_KEY, fileName)
      } catch (error) {
        console.error("Erro ao salvar nome do arquivo:", error)
      }
    }
  }, [fileName])

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsLoading(true)
    setFileName(file.name)

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: "array" })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

        // Remove o cabeçalho (primeira linha)
        const dataRows = jsonData.slice(1) as any[][]

        const processedData: TideData[] = dataRows
          .filter((row) => row.length >= 4 && row[0] && row[1] && row[2] && row[3])
          .map((row) => ({
            data: formatDate(row[0]),
            hora: formatTime(row[1]),
            altura: Number.parseFloat(row[2]) || 0,
            mare: String(row[3]).trim(),
          }))

        setTideData(processedData)
      } catch (error) {
        console.error("Erro ao processar arquivo:", error)
        alert("Erro ao processar o arquivo. Verifique se o formato está correto.")
      } finally {
        setIsLoading(false)
      }
    }

    reader.readAsArrayBuffer(file)
  }, [])

  const handleClearData = useCallback(() => {
    if (confirm("Tem certeza que deseja remover todos os dados carregados?")) {
      setTideData([])
      setFileName("")
      localStorage.removeItem(STORAGE_KEY)
      localStorage.removeItem(STORAGE_FILENAME_KEY)
    }
  }, [])

  const formatDate = (dateValue: any): string => {
    if (typeof dateValue === "number") {
      // Excel date serial number
      const date = XLSX.SSF.parse_date_code(dateValue)
      return `${date.d.toString().padStart(2, "0")}/${date.m.toString().padStart(2, "0")}/${date.y}`
    } else if (dateValue instanceof Date) {
      return `${dateValue.getDate().toString().padStart(2, "0")}/${(dateValue.getMonth() + 1).toString().padStart(2, "0")}/${dateValue.getFullYear()}`
    }
    return String(dateValue)
  }

  const formatTime = (timeValue: any): string => {
    if (typeof timeValue === "number") {
      // Excel time serial number
      const totalMinutes = Math.round(timeValue * 24 * 60)
      const hours = Math.floor(totalMinutes / 60)
      const minutes = totalMinutes % 60
      return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`
    }
    return String(timeValue)
  }

  const adjustTimeForDaylightSaving = (timeString: string): string => {
    if (!isDaylightSaving) return timeString

    try {
      // Parse the time string to a Date object
      const timeParts = timeString.split(":")
      let hours = Number.parseInt(timeParts[0], 10)
      const minutes = Number.parseInt(timeParts[1], 10)

      // Add 1 hour for daylight saving
      hours = (hours + 1) % 24

      // Format back to string
      return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`
    } catch (error) {
      console.error("Erro ao ajustar horário:", error)
      return timeString
    }
  }

  const getMareColor = (mare: string) => {
    const mareType = mare.toLowerCase()
    if (mareType.includes("preia") || mareType.includes("alta")) {
      return "text-blue-600 bg-blue-50"
    } else if (mareType.includes("baixa")) {
      return "text-red-600 bg-red-50"
    }
    return "text-gray-600 bg-gray-50"
  }

  const getMareIcon = (mare: string) => {
    const mareType = mare.toLowerCase()
    if (mareType.includes("preia") || mareType.includes("alta")) {
      return "↑"
    } else if (mareType.includes("baixa")) {
      return "↓"
    }
    return "~"
  }

  const getFilteredTideData = useCallback(() => {
    if (!selectedDate) return tideData

    return tideData
      .filter((tide) => {
        try {
          // Tenta converter a string de data para um objeto Date
          const tideDate = parseISO(tide.data.split("/").reverse().join("-"))
          return isSameDay(tideDate, selectedDate)
        } catch (error) {
          return false
        }
      })
      .map((tide) => ({
        ...tide,
        hora: adjustTimeForDaylightSaving(tide.hora),
      }))
  }, [tideData, selectedDate, isDaylightSaving])

  const timeToMinutes = (timeString: string): number => {
    const [hours, minutes] = timeString.split(":").map(Number)
    return hours * 60 + minutes
  }

  const minutesToTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`
  }

  const findHeightOccurrences = useMemo((): HeightOccurrence[] => {
    const filteredData = getFilteredTideData()
    if (filteredData.length < 2) return []

    const sortedData = [...filteredData].sort((a, b) => timeToMinutes(a.hora) - timeToMinutes(b.hora))
    const occurrences: HeightOccurrence[] = []

    // Verificar pontos exatos
    sortedData.forEach((point) => {
      if (Math.abs(point.altura - targetHeight) < 0.01) {
        occurrences.push({
          hora: point.hora,
          isExact: true,
          isRising: false, // Será determinado pela interpolação
        })
      }
    })

    // Interpolação entre pontos consecutivos
    for (let i = 0; i < sortedData.length - 1; i++) {
      const current = sortedData[i]
      const next = sortedData[i + 1]

      const currentHeight = current.altura
      const nextHeight = next.altura

      // Verificar se a altura alvo está entre os dois pontos
      if (
        (currentHeight <= targetHeight && nextHeight >= targetHeight) ||
        (currentHeight >= targetHeight && nextHeight <= targetHeight)
      ) {
        // Evitar duplicatas de pontos exatos
        if (Math.abs(currentHeight - targetHeight) < 0.01 || Math.abs(nextHeight - targetHeight) < 0.01) {
          continue
        }

        // Interpolação linear
        const heightDiff = nextHeight - currentHeight
        const timeDiff = timeToMinutes(next.hora) - timeToMinutes(current.hora)

        if (Math.abs(heightDiff) > 0.01) {
          const ratio = (targetHeight - currentHeight) / heightDiff
          const interpolatedMinutes = timeToMinutes(current.hora) + ratio * timeDiff
          const interpolatedTime = minutesToTime(Math.round(interpolatedMinutes))

          occurrences.push({
            hora: interpolatedTime,
            isExact: false,
            isRising: nextHeight > currentHeight,
          })
        }
      }
    }

    return occurrences.sort((a, b) => timeToMinutes(a.hora) - timeToMinutes(b.hora))
  }, [getFilteredTideData, targetHeight])

  const getHeightRange = useMemo(() => {
    const filteredData = getFilteredTideData()
    if (filteredData.length === 0) return { min: 0, max: 5 }

    const heights = filteredData.map((d) => d.altura)
    const min = Math.min(...heights)
    const max = Math.max(...heights)
    const padding = (max - min) * 0.1

    return {
      min: Math.max(0, min - padding),
      max: max + padding,
    }
  }, [getFilteredTideData])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 p-4 bg-slate-500">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Waves className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">{"P*pu#os"} </h1>
          </div>
          <p className="text-gray-600">Carregue um arquivo XLS com dados de marés para visualizar a tabela</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Carregar Arquivo XLS
              {tideData.length > 0 && (
                <Button
                  onClick={handleClearData}
                  variant="outline"
                  size="sm"
                  className="ml-auto text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Limpar dados
                </Button>
              )}
            </CardTitle>
            <CardDescription>
              {tideData.length > 0
                ? `Dados carregados permanentemente (${tideData.length} registros)`
                : "Selecione um arquivo Excel (.xls ou .xlsx) com dados de marés"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {tideData.length === 0 ? (
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <FileSpreadsheet className="w-8 h-8 mb-4 text-gray-500" />
                      <p className="mb-2 text-sm text-gray-500">
                        <span className="font-semibold">Clique para carregar</span> ou arraste o arquivo
                      </p>
                      <p className="text-xs text-gray-500">XLS ou XLSX</p>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept=".xls,.xlsx"
                      onChange={handleFileUpload}
                      disabled={isLoading}
                    />
                  </label>
                </div>
              ) : (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-green-800 font-medium">Arquivo carregado: {fileName}</p>
                      <p className="text-green-600 text-sm">{tideData.length} registros salvos permanentemente</p>
                    </div>
                  </div>
                </div>
              )}

              {fileName && (
                <div className="text-sm text-gray-600 text-center">
                  Arquivo carregado: <span className="font-medium">{fileName}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {isLoading && (
          <Card>
            <CardContent className="flex items-center justify-center py-8">
              <div className="text-center space-y-2">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-600">Processando arquivo...</p>
              </div>
            </CardContent>
          </Card>
        )}

        {tideData.length > 0 && !isLoading && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Waves className="h-5 w-5" />
                  Dados de Marés ({getFilteredTideData().length} registros para {format(selectedDate, "dd/MM/yyyy")})
                  {isDaylightSaving && (
                    <span className="text-sm font-normal text-amber-500 ml-2">(Horário de Verão +1h)</span>
                  )}
                </CardTitle>
                <CardDescription>Tabela detalhada com informações de marés</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Filtrar por data</label>
                      <DatePicker date={selectedDate} setDate={setSelectedDate} />
                    </div>
                    <div className="flex items-end">
                      <Button
                        variant="outline"
                        onClick={() => setSelectedDate(new Date())}
                        className="w-full md:w-auto"
                      >
                        Hoje
                      </Button>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b-2 border-gray-200">
                          <th className="text-left p-3 font-semibold text-gray-700">Data</th>
                          <th className="text-left p-3 font-semibold text-gray-700">Hora</th>
                          <th className="text-right p-3 font-semibold text-gray-700">Altura (m)</th>
                          <th className="text-center p-3 font-semibold text-gray-700">Maré</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getFilteredTideData().length > 0 ? (
                          getFilteredTideData().map((row, index) => (
                            <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="p-3 text-gray-900">{row.data}</td>
                              <td className="p-3 text-gray-900 font-mono">
                                {row.hora}
                                {isDaylightSaving && <span className="text-amber-500 ml-1">*</span>}
                              </td>
                              <td className="p-3 text-right font-semibold text-gray-900">{row.altura.toFixed(2)}</td>
                              <td className="p-3 text-center">
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getMareColor(row.mare)}`}
                                >
                                  <span className="text-sm">{getMareIcon(row.mare)}</span>
                                  {row.mare}
                                </span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} className="p-4 text-center text-gray-500">
                              Nenhum registro encontrado para {format(selectedDate, "dd/MM/yyyy")}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                    {isDaylightSaving && (
                      <div className="mt-2 text-xs text-amber-500">
                        * Horário ajustado para horário de verão (+1 hora)
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-5 w-5 text-amber-500" />
                    <Label htmlFor="daylight-saving" className="font-medium">
                      Horário de Verão
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="daylight-saving" checked={isDaylightSaving} onCheckedChange={setIsDaylightSaving} />
                    <span className="text-sm text-gray-500">{isDaylightSaving ? "Ativado (+1h)" : "Desativado"}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      Altura Específica
                    </CardTitle>
                    <CardDescription>Escolha uma altura para ver quando ela ocorre durante o dia</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="target-height">Altura desejada (m)</Label>
                        <div className="flex items-center space-x-4">
                          <Slider
                            id="target-height"
                            min={getHeightRange.min}
                            max={getHeightRange.max}
                            step={0.1}
                            value={[targetHeight]}
                            onValueChange={(value) => setTargetHeight(value[0])}
                            className="flex-1"
                          />
                          <Input
                            type="number"
                            value={targetHeight}
                            onChange={(e) => setTargetHeight(Number.parseFloat(e.target.value) || 0)}
                            min={getHeightRange.min}
                            max={getHeightRange.max}
                            step={0.1}
                            className="w-20"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Ocorrências encontradas</Label>
                        <div className="text-2xl font-bold text-blue-600">{findHeightOccurrences.length}</div>
                      </div>

                      {findHeightOccurrences.length > 0 && (
                        <div className="space-y-2">
                          <Label>Horários quando a altura {targetHeight.toFixed(1)}m ocorre:</Label>
                          <div className="grid grid-cols-1 gap-2">
                            {findHeightOccurrences.map((occurrence, index) => (
                              <div
                                key={index}
                                className={`p-2 rounded-lg text-center text-sm font-medium ${
                                  occurrence.isExact
                                    ? "bg-green-100 text-green-800"
                                    : occurrence.isRising
                                      ? "bg-blue-100 text-blue-800"
                                      : "bg-red-100 text-red-800"
                                }`}
                              >
                                <div className="font-mono">{occurrence.hora}</div>
                                <div className="text-xs">
                                  {occurrence.isExact ? "Exato" : occurrence.isRising ? "Subindo" : "Descendo"}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {findHeightOccurrences.length === 0 && (
                        <div className="text-center py-4 text-gray-500">
                          A altura {targetHeight.toFixed(1)}m não ocorre no dia selecionado
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4 text-sm pt-4 border-t">
                        <div className="bg-blue-50 p-3 rounded-lg">
                          <p className="text-blue-600 font-medium">Altura Máxima</p>
                          <p className="text-lg font-bold text-blue-800">
                            {getFilteredTideData().length > 0
                              ? Math.max(...getFilteredTideData().map((d) => d.altura)).toFixed(2)
                              : "0.00"}
                            m
                          </p>
                        </div>
                        <div className="bg-red-50 p-3 rounded-lg">
                          <p className="text-red-600 font-medium">Altura Mínima</p>
                          <p className="text-lg font-bold text-red-800">
                            {getFilteredTideData().length > 0
                              ? Math.min(...getFilteredTideData().map((d) => d.altura)).toFixed(2)
                              : "0.00"}
                            m
                          </p>
                        </div>
                        <div className="bg-green-50 p-3 rounded-lg">
                          <p className="text-green-600 font-medium">Amplitude</p>
                          <p className="text-lg font-bold text-green-800">
                            {getFilteredTideData().length > 0
                              ? (
                                  Math.max(...getFilteredTideData().map((d) => d.altura)) -
                                  Math.min(...getFilteredTideData().map((d) => d.altura))
                                ).toFixed(2)
                              : "0.00"}
                            m
                          </p>
                        </div>
                        <div className="bg-orange-50 p-3 rounded-lg">
                          <p className="text-orange-600 font-medium">Altura Alvo</p>
                          <p className="text-lg font-bold text-orange-800">{targetHeight.toFixed(1)}m</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="lg:col-span-2">
                <TideChartGraph
                  data={getFilteredTideData()}
                  selectedDate={selectedDate}
                  isDaylightSaving={isDaylightSaving}
                  targetHeight={targetHeight}
                  heightOccurrences={findHeightOccurrences}
                />
              </div>
            </div>

            <WindguruWidget />
          </>
        )}

        {tideData.length === 0 && !isLoading && fileName && (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-gray-600">
                Nenhum dado válido encontrado no arquivo. Verifique se o formato está correto:
              </p>
              <ul className="mt-4 text-sm text-gray-500 space-y-1">
                <li>• Coluna A: Data</li>
                <li>• Coluna B: Hora</li>
                <li>• Coluna C: Altura (m)</li>
                <li>• Coluna D: Maré (Preia-Mar ou Baixa-Mar)</li>
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
