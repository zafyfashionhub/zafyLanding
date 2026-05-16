// app/components/Navbar.tsx
"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { ShoppingCart, User, Search, Menu, X, Heart } from "lucide-react";
import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import AuthModal from "@/components/AuthModal";

export default function Navbar() {
  const { data: session } = useSession();
  const router = useRouter();

  const [cartCount, setCartCount] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    const updateCartCount = () => {
      const cart = JSON.parse(localStorage.getItem("cart") || "[]");
      setCartCount(cart.length);
    };

    updateCartCount();
    window.addEventListener("storage", updateCartCount);
    const interval = setInterval(updateCartCount, 1000);

    return () => {
      window.removeEventListener("storage", updateCartCount);
      clearInterval(interval);
    };
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
      setShowMobileSearch(false);
    }
  };

  const handleUserClick = () => {
    if (session) router.push("/account");
    else setShowAuthModal(true);
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b shadow-sm">
      <nav className="max-w-7xl mx-auto px-4 md:px-6 py-4">
        <div className="flex items-center justify-between">

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden text-2xl"
          >
            {mobileOpen ? <X size={28} /> : <Menu size={28} />}
          </button>

          {/* Logo - Milano Size & Style */}
          <Link href="/" className="flex-shrink-0">
            <Image
              src="/logo/logo-old.png"
              alt="Zafy Fashion Hub"
              width={260}
              height={52}
              className="h-[52px] w-auto object-contain"
              priority
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8 text-sm font-medium tracking-wide">
            <Link href="/category/watches" className="hover:text-black transition">Watch</Link>
            <Link href="/category/perfumes" className="hover:text-black transition">Perfumes</Link>
            <Link href="/category/wallets" className="hover:text-black transition">Wallets</Link>
            <Link href="/category/sunglasses" className="hover:text-black transition">Goggles</Link>
            <Link href="/category/belts" className="hover:text-black transition">Belts</Link>
            <Link href="/category/shoes" className="hover:text-black transition">Shoes</Link>
          </div>

          {/* Right Side Icons */}
          <div className="flex items-center gap-5 md:gap-6">

            {/* Desktop Search */}
            <div className="hidden md:block w-72">
              <form onSubmit={handleSearchSubmit} className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="I'm looking for..."
                  className="w-full bg-gray-100 pl-11 pr-4 py-2.5 rounded-full text-sm focus:outline-none focus:ring-1 focus:ring-black"
                />
              </form>
            </div>

            {/* Mobile Search Icon */}
            <button onClick={() => setShowMobileSearch(!showMobileSearch)} className="md:hidden">
              <Search size={24} />
            </button>

            {/* Wishlist
            <Link href="/account/wishlist" className="hidden md:block">
              <Heart size={24} />
            </Link> */}

            {/* Account
            <button onClick={handleUserClick}>
              <User size={24} />
            </button> */}

            {/* Cart */}
            <Link href="/cart" className="relative">
              <ShoppingCart size={24} />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-medium w-5 h-5 flex items-center justify-center rounded-full">
                  {cartCount}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Mobile Search Bar */}
        {showMobileSearch && (
          <div className="md:hidden mt-4">
            <form onSubmit={handleSearchSubmit}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="I'm looking for..."
                className="w-full bg-gray-100 px-4 py-3 rounded-full text-sm"
                autoFocus
              />
            </form>
          </div>
        )}

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="md:hidden mt-6 border-t pt-6">
            <div className="flex flex-col gap-6 text-base font-medium">
              <Link href="/category/watches">Watch</Link>
              <Link href="/category/perfumes">Perfumes</Link>
              <Link href="/category/wallets">Wallets</Link>
              <Link href="/category/sunglasses">Goggles</Link>
              <Link href="/category/belts">Belts</Link>
              <Link href="/category/shoes">Shoes</Link>
            </div>
          </div>
        )}
      </nav>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </header>
  );
}