"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"

interface WindguruWidgetProps {
  className?: string
}

export function WindguruWidget({ className = "" }: WindguruWidgetProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    const loadWindguruWidget = () => {
      try {
        // Remove any existing Windguru scripts
        const existingScripts = document.querySelectorAll('script[src*="windguru.cz"]')
        existingScripts.forEach((script) => {
          if (script.parentNode) {
            script.parentNode.removeChild(script)
          }
        })

        // Execute the loader function directly
        const loader = () => {
          const arg = [
            "s=9472",
            "m=100",
            "mw=84",
            "uid=wg_fwdg_9472_100_1750267312149",
            "wj=kmh",
            "tj=c",
            "waj=m",
            "tij=m",
            "odh=6",
            "doh=22",
            "fhours=72",
            "hrsm=2",
            "vt=forecasts",
            "lng=pt",
            "idbs=1",
            "p=WINDSPD,GUST,SMER,HTSGW,PERPW,SWEN1,TMP,CDC,APCP1s",
          ]
          const script = document.createElement("script")
          const tag = document.getElementsByTagName("script")[0]
          script.src = "https://www.windguru.cz/js/widget.php?" + arg.join("&")
          script.onload = () => {
            setTimeout(() => {
              setIsLoading(false)
            }, 2000)
          }
          script.onerror = () => {
            setIsLoading(false)
            setHasError(true)
          }
          if (tag && tag.parentNode) {
            tag.parentNode.insertBefore(script, tag)
          }
        }

        // Execute loader immediately
        loader()

        // Fallback timeout
        setTimeout(() => {
          if (isLoading) {
            setIsLoading(false)
            setHasError(true)
          }
        }, 10000)
      } catch (error) {
        console.error("Erro ao carregar Windguru:", error)
        setIsLoading(false)
        setHasError(true)
      }
    }

    // Load widget after component mounts
    const timer = setTimeout(loadWindguruWidget, 500)
    return () => clearTimeout(timer)
  }, [])

  const openWindguruDirect = () => {
    window.open("https://www.windguru.cz/station/9472", "_blank")
  }

  const handleRetry = () => {
    setIsLoading(true)
    setHasError(false)
    window.location.reload()
  }

  return (
    <Card className={className}>
      <CardContent className="p-0">
        <div className="relative">
          {/* Widget container */}
          <div
            id="wg_fwdg_9472_100_1750267312149"
            className="w-full rounded-lg overflow-hidden"
            style={{
              minHeight: isLoading || hasError ? "300px" : "auto",
            }}
          >
            {/* Loading state */}
            {isLoading && (
              <div className="flex items-center justify-center h-[300px] bg-gray-50">
                <div className="text-center space-y-2">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-600 text-sm">Carregando...</p>
                </div>
              </div>
            )}

            {/* Error state */}
            {hasError && !isLoading && (
              <div className="flex items-center justify-center h-[300px] bg-gray-50">
                <div className="text-center space-y-3">
                  <div>
                    <p className="text-gray-600 font-medium text-sm">Widget indisponível</p>
                  </div>
                  <div className="flex gap-2 justify-center">
                    <Button onClick={handleRetry} variant="outline" size="sm">
                      Tentar novamente
                    </Button>
                    <Button onClick={openWindguruDirect} variant="default" size="sm">
                      <ExternalLink className="h-3 w-3 mr-2" />
                      Windguru
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
