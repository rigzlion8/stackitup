import { SignOutButton } from "../SignOutButton";

export function Navbar() {
  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">⚽</span>
            <h1 className="text-xl font-bold text-gray-900">
              Betting Analyzer
            </h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <SignOutButton />
          </div>
        </div>
      </div>
    </nav>
  );
}
