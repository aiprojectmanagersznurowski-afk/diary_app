Pod::Spec.new do |s|
  # Nazwa poda celowo inna niż systemowy framework "WatchConnectivity" (importowany w kodzie
  # Swift tego modułu), żeby uniknąć kolizji nazw w grafie zależności CocoaPods/Xcode.
  s.name           = 'ExpoWatchConnectivity'
  s.version        = '1.0.0'
  s.summary        = 'Odbior nagran z Apple Watch (WCSessionDelegate, inbox, zdarzenia do JS)'
  s.description    = 'Lokalny modul Expo (F4-03): WCSessionDelegate po stronie iPhone, zapis odebranych plikow do Documents/watch-inbox z manifestem, zdarzenie do JS.'
  s.license        = 'MIT'
  s.author         = 'Vocaly'
  s.homepage       = 'https://github.com/aiprojectmanagersznurowski-afk/diary_app'
  s.platforms      = { :ios => '15.1' }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = '**/*.{h,m,swift}'
end
