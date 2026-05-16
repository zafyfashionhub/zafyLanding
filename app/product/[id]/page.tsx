"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WhatsappButton from "@/components/WhatsappButton";
import { viewContent, addToCart as trackAddToCart } from "@/lib/metaPixel";

interface Product {
  id: string;
  title: string;
  price: number;
  compareAtPrice?: number;
  description?: string;
  images: string[];
  category: string;
  stockQuantity: number;
  status: string;
}

export default function ProductDetail() {
  const { id } = useParams();
  const router = useRouter();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [addingToCart, setAddingToCart] = useState(false);
  const [showDescription, setShowDescription] = useState(false);
  const [showShipping, setShowShipping] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const res = await fetch(`/api/products/${id}`);
        if (!res.ok) throw new Error("Product not found");

        const data = await res.json();

        setProduct(data);
        setSelectedImage(0);

        viewContent(
          data.id.toString(),
          data.title,
          Number(data.price)
        );
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchProduct();
  }, [id]);

  const addToCart = async () => {

    if (!product) return;

    if (quantity > product.stockQuantity) {
      alert(
        `Only ${product.stockQuantity} items available`
      );
      return;
    }

    setAddingToCart(true);

    try {

      const cart = JSON.parse(
        localStorage.getItem("cart") || "[]"
      );

      const existingIndex =
        cart.findIndex(
          (item: any) =>
            item.id === product.id
        );

      // ✅ FULL PRODUCT STRUCTURE
      const productData = {

        id: product.id,

        title: product.title,

        slug:
          (product as any).slug || "",

        price:
          Number(product.price),

        compareAtPrice:
          product.compareAtPrice || null,

        quantity,

        stockQuantity:
          Number(product.stockQuantity || 0),

        images:
          Array.isArray(product.images)
            ? product.images
            : [],

        image:
          product.images?.[0] ||
          "/placeholder.jpg",

        category:
          product.category || "",

        status:
          product.status || "In Stock",
      };

      if (existingIndex !== -1) {

        const currentQty =
          cart[existingIndex].quantity || 0;

        const newQty =
          currentQty + quantity;

        // 🚫 prevent exceeding stock
        if (
          newQty >
          product.stockQuantity
        ) {

          alert(
            `Only ${product.stockQuantity} items available`
          );

          setAddingToCart(false);

          return;
        }

        cart[existingIndex].quantity =
          newQty;

      } else {

        cart.push(productData);
      }

      localStorage.setItem(
        "cart",
        JSON.stringify(cart)
      );

      trackAddToCart(
        product.id.toString(),
        product.title,
        Number(product.price) * quantity
      );

      alert(
        `${quantity} × ${product.title} added to cart ✓`
      );

    } catch (err) {

      console.error(err);

      alert("Failed to add to cart");

    } finally {

      setAddingToCart(false);
    }
  };
  if (loading) return <div className="text-center py-20">Loading...</div>;
  if (!product) return <div className="text-center py-20">Product not found</div>;

  const discount = product.compareAtPrice
    ? Math.round(
      ((product.compareAtPrice - product.price) /
        product.compareAtPrice) *
      100
    )
    : 0;

  const isOutOfStock = product.stockQuantity <= 0;
  const canIncrease = quantity < product.stockQuantity;
  return (
    <div className="bg-white min-h-screen">
      <Navbar />

      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">

          {/* Left - Image Gallery */}
          <div>
            <div className="relative aspect-square bg-gray-100 rounded-2xl overflow-hidden mb-6">
              <Image
                src={product.images[selectedImage]}
                alt={product.title}
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
                priority
              />
            </div>

            {/* Thumbnails */}
            <div className="grid grid-cols-5 gap-3">
              {product.images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedImage(i)}
                  className={`relative aspect-square rounded-xl overflow-hidden border-2 transition ${selectedImage === i ? "border-black" : "border-transparent hover:border-gray-300"
                    }`}
                >
                  <Image src={img} alt="" fill className="object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Right - Details */}
          <div className="space-y-8">
            <div>
              <p className="uppercase text-sm tracking-widest text-gray-500">{product.category}</p>
              <h1 className="text-4xl font-light mt-2 leading-tight">{product.title}</h1>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-4">
              <span className="text-5xl font-medium">₹{product.price}</span>
              {product.compareAtPrice && (
                <span className="text-3xl text-gray-400 line-through">₹{product.compareAtPrice}</span>
              )}
              {discount > 0 && <span className="text-green-600 font-semibold text-xl">({discount}% OFF)</span>}
            </div>

            {/* Stock Status */}
            <div className="flex items-center gap-3">
              <span className={`px-5 py-2 rounded-full text-sm font-medium ${isOutOfStock ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                }`}>
                {isOutOfStock ? "Out of Stock" : "In Stock"}
              </span>
              {!isOutOfStock && (
                <span className="text-gray-600">Only <strong>{product.stockQuantity}</strong> left</span>
              )}
            </div>

            {/* Quantity Selector */}
            <div>
              <p className="font-medium mb-3">Quantity</p>
              <div className="flex items-center gap-6">
                <button
                  onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  disabled={quantity === 1}
                  className="w-12 h-12 border rounded-xl text-2xl hover:bg-gray-100 disabled:opacity-50"
                >
                  −
                </button>
                <span className="text-3xl font-medium w-12 text-center">{quantity}</span>
                <button
                  onClick={() => setQuantity(q => q + 1)}
                  disabled={!canIncrease}
                  className="w-12 h-12 border rounded-xl text-2xl hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  +
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-4 pt-4">
              <button
                onClick={addToCart}
                disabled={addingToCart || isOutOfStock}
                className="w-full bg-black hover:bg-gray-900 text-white py-4 rounded-2xl text-lg font-medium disabled:bg-gray-400 transition"
              >
                {addingToCart ? "Adding to Cart..." : "Add to Cart"}
              </button>

              <button
                onClick={async () => {

                  await addToCart();

                  router.push("/checkout");
                }}
                disabled={isOutOfStock}
                className="w-full border-2 border-black hover:bg-gray-50 py-4 rounded-2xl text-lg font-medium transition disabled:opacity-50"
              >
                Buy It Now
              </button>
            </div>

            {/* Trust Badges */}
            <div className="pt-8 border-t grid grid-cols-2 gap-y-6 text-sm">
              <div className="flex items-center gap-3">
                <span className="text-xl">🔒</span>
                <span>100% secure and safe transaction</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xl">✅</span>
                <span>100% genuine products</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xl">🤝</span>
                <span>Authorised dealers</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xl">💡</span>
                <span>Leaders in watch retail since many years</span>
              </div>
            </div>

            {/* Description Accordion */}
            <div className="border-t pt-6">
              <button
                onClick={() => setShowDescription(!showDescription)}
                className="w-full flex justify-between items-center py-4 text-left font-medium border-b"
              >
                Description
                <span className={`transition-transform ${showDescription ? "rotate-180" : ""}`}>↓</span>
              </button>
              {showDescription && (
                <div
                  className="prose text-gray-600 pt-6 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: product.description || "<p>No description available.</p>" }}
                />
              )}
            </div>

            {/* Shipping Policy Accordion */}
            <div className="border-t pt-6">
              <button
                onClick={() => setShowShipping(!showShipping)}
                className="w-full flex justify-between items-center py-4 text-left font-medium border-b"
              >
                Shipping Policy
                <span className={`transition-transform ${showShipping ? "rotate-180" : ""}`}>↓</span>
              </button>
              {showShipping && (
                <div className="text-sm text-gray-600 pt-6 space-y-4">
                  <p><strong>Processing Time:</strong> 3-7 business days</p>
                  <p><strong>Delivery Time:</strong> 5-7 business days</p>
                  <p><strong>Tracking:</strong> Sent via email after shipment</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <WhatsappButton />
      <Footer />
    </div>
  );
}