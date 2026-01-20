'use client';

import { motion } from 'framer-motion';

const features = [
  {
    title: 'Fine Dining',
    description: 'Experience exquisite cuisine prepared by our world-class chefs',
    icon: '🍽️',
  },
  {
    title: 'Elegant Ambiance',
    description: 'Enjoy a sophisticated atmosphere perfect for any occasion',
    icon: '✨',
  },
  {
    title: 'Premium Service',
    description: 'Our attentive staff ensures a memorable dining experience',
    icon: '⭐',
  },
];

export default function Features() {
  return (
    <section className="py-20 px-4 bg-white">
      <div className="max-w-6xl mx-auto">
        <motion.h2
          initial={{ y: 30, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-4xl md:text-5xl font-bold text-center mb-16 text-slate-900"
        >
          Why Choose Us
        </motion.h2>

        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ y: 50, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.2 }}
              whileHover={{ y: -10, transition: { duration: 0.3 } }}
              className="bg-slate-50 p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow"
            >
              <div className="text-5xl mb-4">{feature.icon}</div>
              <h3 className="text-2xl font-semibold mb-3 text-slate-900">
                {feature.title}
              </h3>
              <p className="text-slate-600 leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
