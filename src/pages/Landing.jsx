import React from "react";
import { Button } from "@/components/ui/button";
import { createPageUrl } from "@/utils";
import { ChevronRight, Store } from "lucide-react";
import { motion } from "framer-motion";

export default function Landing() {
  const handleEnter = () => {
    window.location.href = createPageUrl("Dashboard");
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <motion.div
          initial={{ y: -20 }}
          animate={{ y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="mb-8"
        >
          <div className="w-32 h-32 md:w-40 md:h-40 mx-auto mb-6 bg-gradient-to-br from-red-500 to-red-600 rounded-3xl flex items-center justify-center shadow-2xl">
            <Store className="w-16 h-16 md:w-20 md:h-20 text-white" />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-3">
            MyRestaurant
          </h1>
          <p className="text-lg md:text-xl text-gray-400">
            Gestione Ordini Online
          </p>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <Button
            onClick={handleEnter}
            className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-8 py-6 text-lg rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
            size="lg"
          >
            Accedi alla Piattaforma
            <ChevronRight className="w-5 h-5 ml-2" />
          </Button>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="text-gray-500 text-sm mt-8"
        >
          La tua soluzione completa per gestire ordini online
        </motion.p>
      </motion.div>
    </div>
  );
}