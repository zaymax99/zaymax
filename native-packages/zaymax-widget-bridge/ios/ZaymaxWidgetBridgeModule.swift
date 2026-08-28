import ExpoModulesCore
import WidgetKit

public final class ZaymaxWidgetBridgeModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ZaymaxWidgetBridge")

    Function("setString") {
      (key: String, value: String, suiteName: String) -> Bool in
      guard let defaults = UserDefaults(suiteName: suiteName) else {
        return false
      }

      defaults.set(value, forKey: key)
      return defaults.string(forKey: key) == value
    }

    Function("getString") {
      (key: String, suiteName: String) -> String? in
      UserDefaults(suiteName: suiteName)?.string(forKey: key)
    }

    Function("reloadWidget") { (kind: String) in
      WidgetCenter.shared.reloadTimelines(ofKind: kind)
    }
  }
}
