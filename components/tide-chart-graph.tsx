"use client"

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Dot,
} from "recharts"
import { format } from "date-fns"

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

interface TideChartGraphProps {
  data: TideData[]
  selectedDate: Date
  isDaylightSaving: boolean
  targetHeight: number
  heightOccurrences: HeightOccurrence[]
}

interface ChartDataPoint {
  hora: string
  altura: number
  mare: string
  isPreiaMar: boolean
}

const CustomTooltip = ({ active, payload, label, isDaylightSaving }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    const getMareColor = (mare: string) => {
      const mareType = mare.toLowerCase()
      if (mareType.includes("preia") || mareType.includes("alta")) {
        return "text-blue-600 bg-blue-50"
      } else if (mareType.includes("baixa")) {
        return "text-red-600 bg-red-50"
      }
      return "text-gray-600 bg-gray-50"
    }

    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-semibold">
          {`Hora: ${label}`}
          {isDaylightSaving && <span className="text-amber-500 ml-1">*</span>}
        </p>
        <p className="text-blue-600 font-medium">{`Altura: ${data.altura.toFixed(2)}m`}</p>
        <span className={`inline-block px-2 py-1 rounded text-xs font-medium mt-1 ${getMareColor(data.mare)}`}>
          {data.isPreiaMar ? "↑" : "↓"} {data.mare}
        </span>
      </div>
    )
  }
  return null
}

const CustomDot = (props: any) => {
  const { cx, cy, payload } = props

  // Verificação de segurança para evitar erro quando payload é undefined
  if (!payload || typeof payload.isPreiaMar === "undefined") {
    return <Dot cx={cx} cy={cy} r={6} fill="#2563eb" stroke="#2563eb" strokeWidth={2} />
  }

  const color = payload.isPreiaMar ? "#2563eb" : "#dc2626"
  return <Dot cx={cx} cy={cy} r={6} fill={color} stroke={color} strokeWidth={2} />
}

export function TideChartGraph({
  data,
  selectedDate,
  isDaylightSaving,
  targetHeight,
  heightOccurrences,
}: TideChartGraphProps) {
  const chartData: ChartDataPoint[] = data
    .map((tide) => ({
      hora: tide.hora,
      altura: tide.altura,
      mare: tide.mare,
      isPreiaMar: tide.mare.toLowerCase().includes("preia") || tide.mare.toLowerCase().includes("alta"),
    }))
    .sort((a, b) => a.hora.localeCompare(b.hora))

  if (chartData.length === 0) {
    return (
      <div className="bg-white p-8 rounded-lg border text-center">
        <p className="text-gray-500">Nenhum dado disponível para gerar o gráfico</p>
      </div>
    )
  }

  const maxHeight = Math.max(...chartData.map((d) => d.altura))
  const minHeight = Math.min(...chartData.map((d) => d.altura))
  const padding = (maxHeight - minHeight) * 0.1

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Gráfico de Marés - {format(selectedDate, "dd/MM/yyyy")}
          {isDaylightSaving && <span className="text-sm font-normal text-amber-500 ml-2">(Horário de Verão +1h)</span>}
        </h3>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
            <span>Preia-Mar</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-600 rounded-full"></div>
            <span>Baixa-Mar</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-1 bg-orange-500"></div>
            <span>Altura: {targetHeight.toFixed(1)}m</span>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg border shadow-sm">
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="hora" stroke="#666" fontSize={12} tick={{ fill: "#666" }} />
            <YAxis
              stroke="#666"
              fontSize={12}
              tick={{ fill: "#666" }}
              label={{ value: "Altura (m)", angle: -90, position: "insideLeft", style: { textAnchor: "middle" } }}
              domain={[minHeight - padding, maxHeight + padding]}
            />
            <Tooltip content={(props) => <CustomTooltip {...props} isDaylightSaving={isDaylightSaving} />} />
            <ReferenceLine y={0} stroke="#999" strokeDasharray="2 2" />
            <ReferenceLine
              y={targetHeight}
              stroke="#f97316"
              strokeWidth={2}
              strokeDasharray="5 5"
              label={{
                value: `${targetHeight.toFixed(1)}m`,
                position: "topRight",
                style: { fill: "#f97316", fontWeight: "bold" },
              }}
            />
            {heightOccurrences.map((occurrence, index) => (
              <ReferenceLine
                key={index}
                x={occurrence.hora}
                stroke={occurrence.isExact ? "#22c55e" : occurrence.isRising ? "#3b82f6" : "#ef4444"}
                strokeWidth={2}
                strokeDasharray="3 3"
                label={{
                  value: occurrence.hora,
                  position: "top",
                  style: {
                    fill: occurrence.isExact ? "#22c55e" : occurrence.isRising ? "#3b82f6" : "#ef4444",
                    fontWeight: "bold",
                    fontSize: "12px",
                  },
                }}
              />
            ))}
            <Line
              type="monotone"
              dataKey="altura"
              stroke="#2563eb"
              strokeWidth={3}
              dot={<CustomDot />}
              activeDot={{ r: 8, fill: "#1d4ed8", stroke: "#1d4ed8", strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
